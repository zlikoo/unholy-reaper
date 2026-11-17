// Legt den ersten Admin-Account (Rang President) an.
//
// Interaktiv:
//   npm run admin:create
//
// Mit Parametern:
//   npm run admin:create -- --username grim --name "Elias Voss" --password "geheim123"
//
// Sind noch keine Clubregeln gespeichert, werden die Startinhalte aus src/features/rules/default-rules.ts angelegt.
//
// Existiert der Benutzername bereits, bricht das Skript ab. Mit --reset werden
// Passwort, Rang (President) und Aktiv-Status des vorhandenen Kontos zurückgesetzt
// (Notfallzugang, falls sich niemand mehr einloggen kann).

import "dotenv/config";
import { createInterface, type Interface } from "node:readline";
import { Writable } from "node:stream";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/prisma-client";
import { DEFAULT_RULES } from "../src/features/rules/default-rules";

const MIN_PASSWORD = 8;

function arg(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

// Eingaben über eine gemeinsame Readline-Instanz lesen. Die Ausgabe läuft über einen
// Strom, der sich bei Passwörtern stummschalten lässt, damit die Eingabe nicht sichtbar ist.
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) stdout.write(chunk, encoding);
    callback();
  },
});
let rl: Interface | undefined;
let lines: AsyncIterator<string> | undefined;

async function ask(question: string, hidden = false) {
  if (!rl) {
    rl = createInterface({ input: stdin, output, terminal: Boolean(stdin.isTTY) });
    lines = rl[Symbol.asyncIterator]();
  }
  rl.setPrompt(question);
  rl.prompt();
  muted = hidden && Boolean(stdin.isTTY);
  const next = await lines!.next();
  muted = false;
  if (hidden && stdin.isTTY) stdout.write("\n");
  if (next.done) throw new Error("Eingabe abgebrochen.");
  return String(next.value).trim();
}

async function main() {
  const db = createPrismaClient();
  try {
    const reset = process.argv.includes("--reset");
    const username = (arg("username") ?? (await ask("Benutzername: "))).toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      throw new Error("Benutzername: 3–30 Zeichen, nur Kleinbuchstaben, Ziffern, Punkt, Unterstrich, Bindestrich.");
    }

    const existing = await db.user.findUnique({ where: { username } });
    if (existing && !reset) {
      throw new Error(`Der Benutzername „${username}“ existiert bereits. Mit --reset wird das Konto zurückgesetzt.`);
    }

    const name = existing ? existing.name : (arg("name") ?? (await ask("Name des Charakters: ")));
    if (!name || name.length > 80) throw new Error("Bitte einen Namen mit höchstens 80 Zeichen angeben.");

    let password = arg("password");
    if (!password) {
      password = await ask("Passwort: ", true);
      const repeat = await ask("Passwort wiederholen: ", true);
      if (password !== repeat) throw new Error("Die Passwörter stimmen nicht überein.");
    }
    if (password.length < MIN_PASSWORD) throw new Error(`Das Passwort muss mindestens ${MIN_PASSWORD} Zeichen haben.`);

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { passwordHash, role: "PRESIDENT", active: true },
      });
      await db.session.deleteMany({ where: { userId: existing.id } });
      await db.activityLog.create({
        data: {
          userId: null,
          action: "member.reset",
          entityType: "MEMBER",
          entityId: existing.id,
          summary: `Konto „${existing.name}“ per Kommandozeile zurückgesetzt (President, aktiv, neues Passwort)`,
        },
      });
      console.log(`Konto „${username}“ wurde zurückgesetzt und ist jetzt President.`);
    } else {
      const user = await db.user.create({
        data: { username, name, passwordHash, role: "PRESIDENT", active: true },
      });
      await db.activityLog.create({
        data: {
          userId: null,
          action: "member.create",
          entityType: "MEMBER",
          entityId: user.id,
          summary: `Admin-Konto „${name}“ (President) per Kommandozeile angelegt`,
        },
      });
      console.log(`Admin-Konto „${username}“ (President) wurde angelegt. Login unter /login.`);

      // Beim ersten Einrichten die Clubregeln mit den Startinhalten füllen.
      if ((await db.clubRule.count()) === 0) {
        await db.clubRule.createMany({ data: DEFAULT_RULES.map((rule, index) => ({ ...rule, sortOrder: index })) });
        console.log("Clubregeln, Hierarchie und die Regeln für Hangarounds/Prospects wurden mit den Startinhalten angelegt.");
      }
    }
  } finally {
    rl?.close();
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(`Fehler: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
