// Beispieldaten zum Testen. Alle Namen und Daten sind frei erfunden (In-Game-Daten).
//
//   npm run db:seed            füllt eine leere Datenbank
//   npm run db:seed -- --force löscht vorhandene Daten und füllt neu
//
// Alle Demo-Konten haben das Passwort aus DEMO_PASSWORD.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/prisma-client";
import { encryptSecret } from "../src/lib/crypto";
import { zonedTimeToDate } from "../src/lib/dates";
import type { Role } from "../src/generated/prisma/enums";
import { DEFAULT_RULES } from "./seed-rules";

const DEMO_PASSWORD = "reaper123";
const db = createPrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
/** Zeitpunkt vor `days` Tagen, optional mit Stunde (UTC) */
const daysAgo = (days: number, hour = 19) => {
  const d = new Date(now - days * DAY);
  d.setUTCHours(hour, (days * 7) % 60, 0, 0);
  return d;
};
/** Termin in `days` Tagen zur vollen Stunde (Ortszeit APP_TIMEZONE) */
const daysAhead = (days: number, hour = 19) => {
  const d = new Date(now + days * DAY);
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: process.env.APP_TIMEZONE || "Europe/Berlin" }).format(d);
  const [y, m, day] = local.split("-").map(Number);
  return zonedTimeToDate(y, m, day, hour, 0);
};

async function wipe() {
  await db.activityLog.deleteMany();
  await db.weaponMovement.deleteMany();
  await db.weapon.deleteMany();
  await db.lockerAccess.deleteMany();
  await db.locker.deleteMany();
  await db.transaction.deleteMany();
  await db.vehicle.deleteMany();
  await db.post.deleteMany();
  await db.clubRule.deleteMany();
  await db.session.deleteMany();
  await db.user.updateMany({ data: { sponsorId: null } });
  await db.user.deleteMany();
  await db.setting.deleteMany();
}

async function main() {
  const force = process.argv.includes("--force");
  const existingUsers = await db.user.count();
  if (existingUsers > 0 && !force) {
    console.log(
      `Die Datenbank enthält bereits ${existingUsers} Mitglieder. Seed abgebrochen.\n` +
        "Zum Überschreiben: npm run db:seed -- --force (löscht ALLE Daten!)",
    );
    return;
  }
  if (force) {
    console.log("Lösche vorhandene Daten …");
    await wipe();
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ---------------------------------------------------------------- Mitglieder
  const memberData: Array<{
    key: string;
    username: string;
    name: string;
    roadName: string;
    role: Role;
    joinedDaysAgo: number;
    active?: boolean;
    notes?: string;
    sponsor?: string;
  }> = [
    { key: "grim", username: "grim", name: "Elias Voss", roadName: "Grim", role: "PRESIDENT", joinedDaysAgo: 420, notes: "Gründungsmitglied. Hat das Chapter in Blaine County aufgebaut." },
    { key: "hatchet", username: "hatchet", name: "Marcus Kane", roadName: "Hatchet", role: "VICE_PRESIDENT", joinedDaysAgo: 400 },
    { key: "bones", username: "bones", name: "Dante Ruiz", roadName: "Bones", role: "SERGEANT_AT_ARMS", joinedDaysAgo: 310, notes: "Zuständig für Sicherheit und das Waffenlager." },
    { key: "ledger", username: "ledger", name: "Lena Hartmann", roadName: "Ledger", role: "TREASURER", joinedDaysAgo: 250, notes: "Führt die Clubkasse." },
    { key: "spoke", username: "spoke", name: "Tommy Walsh", roadName: "Spoke", role: "MEMBER", joinedDaysAgo: 160, notes: "Mechaniker, kümmert sich um die Bikes." },
    { key: "rust", username: "rust", name: "Viktor Petrov", roadName: "Rust", role: "MEMBER", joinedDaysAgo: 95 },
    { key: "smoke", username: "smoke", name: "Jesse Carter", roadName: "Smoke", role: "MEMBER", joinedDaysAgo: 200, active: false, notes: "Seit Oktober inaktiv (Charakter pausiert)." },
    { key: "rookie", username: "rookie", name: "Kid Morales", roadName: "Rookie", role: "PROSPECT", joinedDaysAgo: 21, notes: "Prospect seit drei Wochen.", sponsor: "spoke" },
    { key: "dust", username: "dust", name: "Danny Reyes", roadName: "Dust", role: "HANGAROUND", joinedDaysAgo: 6, notes: "Hilft in der Werkstatt aus.", sponsor: "rust" },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const m of memberData) {
    const user = await db.user.create({
      data: {
        username: m.username,
        passwordHash,
        name: m.name,
        roadName: m.roadName,
        role: m.role,
        active: m.active ?? true,
        joinedAt: daysAgo(m.joinedDaysAgo, 12),
        notes: m.notes,
      },
    });
    users[m.key] = user;
  }
  const u = (key: string) => users[key].id;
  for (const m of memberData) {
    if (m.sponsor) await db.user.update({ where: { id: u(m.key) }, data: { sponsorId: u(m.sponsor) } });
  }

  // ---------------------------------------------------------------- Clubregeln
  await db.clubRule.createMany({
    data: DEFAULT_RULES.map((rule, index) => ({ ...rule, sortOrder: index })),
  });

  // ---------------------------------------------------------------- Einstellungen
  await db.setting.create({ data: { key: "treasury.approvalThreshold", value: "10000" } });

  // ---------------------------------------------------------------- Fahrzeuge
  await db.vehicle.createMany({
    data: [
      { model: "Western Daemon", plate: "UR 001", type: "MOTORCYCLE", ownerId: null, status: "IN_GARAGE", location: "Clubhaus Sandy Shores", notes: "Club-Bike für Prospects." },
      { model: "Western Zombie Chopper", plate: "GRIM 13", type: "MOTORCYCLE", ownerId: u("grim"), status: "ON_ROAD", location: "Route 68" },
      { model: "Western Nightblade", plate: "HTCHT 66", type: "MOTORCYCLE", ownerId: u("hatchet"), status: "IN_GARAGE", location: "Clubhaus Sandy Shores" },
      { model: "LCC Avarus", plate: "BONES 7", type: "MOTORCYCLE", ownerId: u("bones"), status: "DAMAGED", location: "Werkstatt Paleto Bay", notes: "Getriebeschaden nach Verfolgungsjagd." },
      { model: "Western Gargoyle", plate: "SPOKE 21", type: "MOTORCYCLE", ownerId: u("spoke"), status: "IMPOUNDED", location: "LSPD Impound, Mission Row", notes: "Beschlagnahmt nach Verkehrskontrolle. Auslöse: 2.500 $." },
      { model: "Western Wolfsbane", plate: "RUST 88", type: "MOTORCYCLE", ownerId: u("rust"), status: "IN_GARAGE", location: "Garage Grapeseed" },
      { model: "Vapid Sandking XL", plate: "UR 100", type: "CAR", ownerId: null, status: "IN_GARAGE", location: "Clubhaus Sandy Shores", notes: "Begleitfahrzeug für Ausfahrten." },
      { model: "Declasse Burrito", plate: "UR 200", type: "CAR", ownerId: null, status: "ON_ROAD", location: "Unterwegs nach Los Santos", notes: "Transporter für Ersatzteile." },
      { model: "Nagasaki Blazer (Quad)", plate: "UR 300", type: "OTHER", ownerId: null, status: "IN_GARAGE", location: "Clubhaus Sandy Shores" },
    ],
  });

  // ---------------------------------------------------------------- Kasse
  const tx = (
    days: number,
    type: "DEPOSIT" | "WITHDRAWAL",
    amount: number,
    category: "DONATION" | "SALE" | "WEAPONS" | "VEHICLES" | "OTHER",
    description: string,
    memberKey: string | null,
    createdBy: string,
    status: "APPROVED" | "PENDING" | "REJECTED" = "APPROVED",
    reviewedBy?: string,
  ) => ({
    type,
    amount,
    category,
    description,
    memberId: memberKey ? u(memberKey) : null,
    date: daysAgo(days),
    status,
    createdById: u(createdBy),
    reviewedById: reviewedBy ? u(reviewedBy) : null,
    reviewedAt: reviewedBy ? daysAgo(days - 0.2) : null,
    createdAt: daysAgo(days),
  });

  await db.transaction.createMany({
    data: [
      tx(45, "DEPOSIT", 40000, "OTHER", "Startkapital aus der alten Kasse", null, "ledger"),
      tx(29, "DEPOSIT", 2500, "DONATION", "Monatsbeitrag", "grim", "ledger"),
      tx(29, "DEPOSIT", 2500, "DONATION", "Monatsbeitrag", "hatchet", "ledger"),
      tx(28, "DEPOSIT", 2500, "DONATION", "Monatsbeitrag", "bones", "ledger"),
      tx(27, "WITHDRAWAL", 3200, "VEHICLES", "Reparatur Avarus (Getriebe)", "bones", "ledger"),
      tx(25, "DEPOSIT", 8500, "SALE", "Verkauf Ersatzteile an Werkstatt Harmony", "spoke", "ledger"),
      tx(23, "WITHDRAWAL", 6000, "WEAPONS", "Ankauf Munition (20 Schachteln)", "bones", "hatchet"),
      tx(21, "DEPOSIT", 1500, "DONATION", "Aufnahmegebühr Prospect", "rookie", "ledger"),
      tx(19, "WITHDRAWAL", 2500, "VEHICLES", "Auslöse Gargoyle beim LSPD", "spoke", "ledger"),
      tx(17, "DEPOSIT", 12000, "SALE", "Verkauf Western Bagger an Händler", null, "grim"),
      tx(15, "WITHDRAWAL", 14000, "WEAPONS", "Ankauf 2x Pump Shotgun", "bones", "hatchet", "APPROVED", "ledger"),
      tx(13, "WITHDRAWAL", 850, "OTHER", "Getränke für die Clubbar", null, "ledger"),
      tx(11, "DEPOSIT", 2500, "DONATION", "Monatsbeitrag", "spoke", "ledger"),
      tx(11, "DEPOSIT", 2500, "DONATION", "Monatsbeitrag", "rust", "ledger"),
      tx(9, "WITHDRAWAL", 18000, "VEHICLES", "Neuer Transporter", null, "hatchet", "REJECTED", "grim"),
      tx(8, "DEPOSIT", 5400, "SALE", "Verkauf Schrottteile", "rust", "ledger"),
      tx(6, "WITHDRAWAL", 1200, "VEHICLES", "Tankfüllungen Ausfahrt Paleto", null, "ledger"),
      tx(4, "DEPOSIT", 3000, "DONATION", "Spende von Freunden des Clubs", null, "grim"),
      tx(3, "WITHDRAWAL", 4500, "WEAPONS", "Schutzwesten (3 Stück)", "bones", "ledger"),
      tx(1, "DEPOSIT", 7200, "SALE", "Verkauf Teile an Benny's", "spoke", "ledger"),
      tx(0.5, "WITHDRAWAL", 15000, "VEHICLES", "Anzahlung neues Club-Bike (Western Bagger)", null, "hatchet", "PENDING"),
    ],
  });

  // ---------------------------------------------------------------- Schließfächer
  // Hangarounds bekommen nie Zugriff auf Schließfächer.
  const allRoles: Role[] = ["PRESIDENT", "VICE_PRESIDENT", "SERGEANT_AT_ARMS", "TREASURER", "MEMBER", "PROSPECT"];
  const lockerData = [
    { key: "keller", name: "Clubhaus Keller", number: "01", location: "Clubhaus Sandy Shores, Keller", code: "4471", password: "grimreaper", roles: allRoles.filter((r) => r !== "PROSPECT"), notes: "Standardfach für ausgabefähige Waffen." },
    { key: "kammer", name: "Waffenkammer", number: "02", location: "Clubhaus Sandy Shores, Hinterzimmer", code: "9013", password: "ironcross", roles: ["PRESIDENT", "VICE_PRESIDENT", "SERGEANT_AT_ARMS"] as Role[], notes: "Nur für Officers mit Waffenverantwortung." },
    { key: "werkstatt", name: "Werkstatt-Spind", number: "03", location: "Clubhaus Sandy Shores, Werkstatt", code: "1234", password: "rookie", roles: allRoles, notes: "Werkzeug und Nahkampfwaffen. Auch für Prospects." },
    { key: "reserve", name: "Notreserve Paleto", number: "07", location: "Paleto Bay, Lagerhalle 4", code: "666", password: "lastride", roles: ["PRESIDENT", "VICE_PRESIDENT"] as Role[], notes: "Nur im Ernstfall öffnen." },
  ];
  const lockers: Record<string, { id: string; name: string }> = {};
  for (const l of lockerData) {
    const locker = await db.locker.create({
      data: {
        name: l.name,
        number: l.number,
        location: l.location,
        codeEncrypted: encryptSecret(l.code),
        passwordEncrypted: encryptSecret(l.password),
        notes: l.notes,
        access: { create: l.roles.map((role) => ({ role })) },
      },
    });
    lockers[l.key] = locker;
  }

  // ---------------------------------------------------------------- Waffen
  type WeaponSeed = {
    name: string;
    serialNumber?: string;
    quantity: number;
    status: "IN_STOCK" | "ISSUED" | "LOST";
    locker?: string;
    holder?: string;
    issuedDaysAgo?: number;
    fromLocker?: string;
    notes?: string;
  };
  const weaponData: WeaponSeed[] = [
    { name: "Pistole .50", serialNumber: "UR-P-001", quantity: 1, status: "IN_STOCK", locker: "keller" },
    { name: "Pistole .50", serialNumber: "UR-P-002", quantity: 1, status: "ISSUED", holder: "bones", issuedDaysAgo: 12, fromLocker: "keller" },
    { name: "Combat Pistol", serialNumber: "UR-P-003", quantity: 1, status: "ISSUED", holder: "grim", issuedDaysAgo: 30, fromLocker: "kammer" },
    { name: "Micro SMG", serialNumber: "UR-S-011", quantity: 1, status: "IN_STOCK", locker: "kammer" },
    { name: "Pump Shotgun", serialNumber: "UR-SG-07", quantity: 1, status: "ISSUED", holder: "spoke", issuedDaysAgo: 5, fromLocker: "keller" },
    { name: "Pump Shotgun", serialNumber: "UR-SG-08", quantity: 1, status: "IN_STOCK", locker: "kammer" },
    { name: "Sawed-Off Shotgun", serialNumber: "UR-SG-02", quantity: 1, status: "LOST", holder: "smoke", notes: "Bei Polizeikontrolle verloren." },
    { name: "Messer", quantity: 6, status: "IN_STOCK", locker: "werkstatt" },
    { name: "Schlagstock", quantity: 4, status: "IN_STOCK", locker: "werkstatt" },
    { name: "Munition 9mm (Schachtel)", quantity: 30, status: "IN_STOCK", locker: "keller" },
    { name: "Munition 9mm (Schachtel)", quantity: 10, status: "ISSUED", holder: "rust", issuedDaysAgo: 2, fromLocker: "keller" },
    { name: "Schutzweste", quantity: 5, status: "IN_STOCK", locker: "keller" },
    { name: "Schutzweste", quantity: 2, status: "ISSUED", holder: "hatchet", issuedDaysAgo: 3, fromLocker: "keller" },
    { name: "Assault Rifle", serialNumber: "UR-AR-001", quantity: 2, status: "IN_STOCK", locker: "reserve", notes: "Nur auf Anweisung des Presidents." },
  ];

  for (const w of weaponData) {
    const locker = w.locker ? lockers[w.locker] : null;
    const weapon = await db.weapon.create({
      data: {
        name: w.name,
        serialNumber: w.serialNumber ?? null,
        quantity: w.quantity,
        status: w.status,
        lockerId: locker?.id ?? null,
        holderId: w.holder ? u(w.holder) : null,
        issuedAt: w.issuedDaysAgo !== undefined ? daysAgo(w.issuedDaysAgo) : null,
        notes: w.notes ?? null,
        createdAt: daysAgo(40),
      },
    });
    const base = { weaponId: weapon.id, weaponName: w.name, serialNumber: w.serialNumber ?? null };
    const stockLocker = locker ?? (w.fromLocker ? lockers[w.fromLocker] : lockers.keller);
    await db.weaponMovement.create({
      data: {
        ...base,
        type: "STOCK_IN",
        quantity: w.quantity,
        date: daysAgo(40),
        performedById: u("bones"),
        lockerId: stockLocker.id,
        lockerName: stockLocker.name,
      },
    });
    if (w.status === "ISSUED" && w.holder) {
      const from = lockers[w.fromLocker ?? "keller"];
      await db.weaponMovement.create({
        data: {
          ...base,
          type: "ISSUE",
          quantity: w.quantity,
          memberId: u(w.holder),
          date: daysAgo(w.issuedDaysAgo ?? 1),
          performedById: u("bones"),
          lockerId: from.id,
          lockerName: from.name,
        },
      });
    }
    if (w.status === "LOST" && w.holder) {
      await db.weaponMovement.create({
        data: { ...base, type: "ISSUE", quantity: w.quantity, memberId: u(w.holder), date: daysAgo(25), performedById: u("bones"), lockerId: lockers.keller.id, lockerName: lockers.keller.name },
      });
      await db.weaponMovement.create({
        data: { ...base, type: "LOST", quantity: w.quantity, memberId: u(w.holder), date: daysAgo(18), performedById: u("bones"), note: w.notes },
      });
    }
  }

  // ---------------------------------------------------------------- Schwarzes Brett
  await db.post.createMany({
    data: [
      {
        title: "Hausregeln im Clubhaus",
        content:
          "1. Keine Fremden im Hinterzimmer.\n2. Waffen werden nur über Bones ausgegeben und sofort im Tool eingetragen.\n3. Club-Fahrzeuge nach jeder Fahrt wieder einlagern.\n4. Was im Club besprochen wird, bleibt im Club.",
        category: "IMPORTANT",
        audience: "PROSPECTS",
        pinned: true,
        authorId: u("grim"),
        createdAt: daysAgo(30),
      },
      {
        title: "Church am Sonntag",
        content: "Pflichttermin für alle Members. Themen: neue Prospects, Kasse, Ausfahrt nach Paleto.",
        category: "EVENT",
        audience: "MEMBERS",
        pinned: true,
        eventAt: daysAhead(4, 19),
        authorId: u("hatchet"),
        createdAt: daysAgo(2),
      },
      {
        title: "Ausfahrt nach Paleto Bay",
        content: "Treffpunkt Clubhaus Sandy Shores. Wer kein eigenes Bike hat, meldet sich bei Spoke wegen der Daemon.",
        category: "RIDE",
        audience: "PROSPECTS",
        eventAt: daysAhead(2, 18),
        authorId: u("spoke"),
        createdAt: daysAgo(1),
      },
      {
        title: "Officer-Meeting: Kasse und Waffenkammer",
        content: "Die Anzahlung für das neue Club-Bike steht zur Freigabe an. Bitte vorher den Kassenstand ansehen.",
        category: "INFO",
        audience: "OFFICERS",
        authorId: u("ledger"),
        createdAt: daysAgo(0.4),
      },
      {
        title: "Offener Werkstatt-Abend",
        content: "Freitag ab 20 Uhr ist die Werkstatt am Clubhaus offen. Hangarounds und Gäste sind willkommen, Clubräume bleiben geschlossen.",
        category: "EVENT",
        audience: "ALL",
        eventAt: daysAhead(3, 20),
        authorId: u("spoke"),
        createdAt: daysAgo(0.8),
      },
      {
        title: "Willkommen, Rookie",
        content: "Kid „Rookie“ Morales ist seit drei Wochen Prospect. Sein Sponsor ist Spoke.",
        category: "INFO",
        audience: "PROSPECTS",
        authorId: u("grim"),
        createdAt: daysAgo(20),
      },
    ],
  });

  // ---------------------------------------------------------------- Aktivitätslog
  await db.activityLog.createMany({
    data: [
      { userId: u("grim"), action: "member.create", entityType: "MEMBER", summary: "Mitglied „Kid Morales“ als Prospect aufgenommen", createdAt: daysAgo(21) },
      { userId: u("ledger"), action: "transaction.create", entityType: "TRANSACTION", summary: "Einzahlung 7.200 $ gebucht: Verkauf Teile an Benny's", createdAt: daysAgo(1) },
      { userId: u("bones"), action: "weapon.issue", entityType: "WEAPON", summary: "10× Munition 9mm (Schachtel) an Viktor Petrov ausgegeben", createdAt: daysAgo(2) },
      { userId: u("spoke"), action: "vehicle.update", entityType: "VEHICLE", summary: "Fahrzeug Western Gargoyle (SPOKE 21) bearbeitet: Status: Unterwegs → Beschlagnahmt", details: JSON.stringify({ Status: ["Unterwegs", "Beschlagnahmt"] }), createdAt: daysAgo(19) },
      { userId: u("hatchet"), action: "transaction.create", entityType: "TRANSACTION", summary: "Auszahlung 15.000 $ angelegt, wartet auf Freigabe: Anzahlung neues Club-Bike (Western Bagger)", createdAt: daysAgo(0.5) },
      { userId: u("grim"), action: "member.update", entityType: "MEMBER", summary: "Mitglied „Jesse Carter“ deaktiviert", details: JSON.stringify({ Status: ["aktiv", "inaktiv"] }), createdAt: daysAgo(15) },
    ],
  });

  console.log("Seed fertig.");
  console.log(`Demo-Logins (Passwort für alle: ${DEMO_PASSWORD}):`);
  for (const m of memberData) {
    console.log(`  ${m.username.padEnd(8)} ${m.role}${m.active === false ? " (inaktiv)" : ""}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
