// Rechte nach Rang. Diese Datei ist auch im Browser nutzbar (Buttons ein-/ausblenden),
// geprüft wird aber immer zusätzlich auf dem Server.
//
// Lesen: Alle ab Prospect sehen Fahrzeuge, Kasse, Waffenlager, Mitglieder und die
// Schließfächer, für die ihr Rang freigeschaltet ist. Hangarounds sind keine Mitglieder
// und sehen nur Dashboard, Schwarzes Brett (Aushänge "für alle") und die Clubregeln.
//
// Road Captain: Officer für Ausfahrten und Fahrzeuge.
// IT: technische Verwaltung der App (Accounts, Passwörter, Log), ohne Rangvergabe.
import type { PostAudience } from "@/generated/prisma/enums";
import { Role } from "@/generated/prisma/enums";

const { PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER, ROAD_CAPTAIN, IT, MEMBER, PROSPECT, HANGAROUND } = Role;

const FULL_MEMBERS = [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER, ROAD_CAPTAIN, IT, MEMBER] as const;

export const PERMISSIONS = {
  /** Club-Interna lesen: Fahrzeuge, Kasse, Waffenlager, Schließfächer, Mitglieder */
  "club.view": [...FULL_MEMBERS, PROSPECT],
  /** Fahrzeuge anlegen, bearbeiten, ein- und auslagern */
  "vehicles.edit": FULL_MEMBERS,
  /** Fahrzeuge löschen */
  "vehicles.delete": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, ROAD_CAPTAIN],
  /** Waffen einlagern, ausgeben, zurücknehmen, als verloren melden */
  "weapons.edit": FULL_MEMBERS,
  /** Lagerposten löschen */
  "weapons.delete": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Schließfächer anlegen, bearbeiten, Zugriff festlegen (nur für Fächer, die man selbst sehen darf) */
  "lockers.manage": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Aushänge am Schwarzen Brett veröffentlichen und eigene bearbeiten */
  "board.post": FULL_MEMBERS,
  /** Alle Aushänge bearbeiten, löschen und anpinnen */
  "board.moderate": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, ROAD_CAPTAIN],
  /** Clubregeln und Hierarchie-Texte pflegen (Secretary dokumentiert Clubbeschlüsse) */
  "rules.manage": [PRESIDENT, VICE_PRESIDENT, TREASURER],
  /** Kassenbuchungen anlegen und löschen */
  "treasury.edit": [PRESIDENT, VICE_PRESIDENT, TREASURER],
  /** Große Auszahlungen freigeben oder ablehnen */
  "treasury.approve": [PRESIDENT, TREASURER],
  /** Freigabegrenze ändern */
  "treasury.settings": [PRESIDENT, TREASURER],
  /** Ränge vergeben und ändern (dazu: Konten aller Ränge verwalten) */
  "members.manage": [PRESIDENT, VICE_PRESIDENT],
  /** Konten verwalten: anlegen (bis Fullpatch), Passwort zurücksetzen, (de)aktivieren – ohne Officers */
  "members.accounts": [PRESIDENT, VICE_PRESIDENT, IT],
  /** Aktivitätslog einsehen */
  "log.view": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, IT],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Officers des Clubs (für Aushänge "nur Officers" und den Schutz ihrer Konten). */
export const OFFICER_ROLES: readonly Role[] = [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER, ROAD_CAPTAIN];

/** Ränge, die als Sponsor für Prospects und Hangarounds infrage kommen. */
export const SPONSOR_ROLES: readonly Role[] = FULL_MEMBERS;

export function isOfficer(role: Role) {
  return OFFICER_ROLES.includes(role);
}

/** Welche Aushänge ein Rang am Schwarzen Brett sieht. */
export function visibleAudiences(role: Role): PostAudience[] {
  if (role === HANGAROUND) return ["ALL"];
  if (role === PROSPECT) return ["ALL", "PROSPECTS"];
  if (isOfficer(role)) return ["ALL", "PROSPECTS", "MEMBERS", "OFFICERS"];
  return ["ALL", "PROSPECTS", "MEMBERS"];
}

// ---------------------------------------------------------------- Mitgliederverwaltung

/** Ränge, die IT beim Anlegen vergeben darf. */
const IT_ASSIGNABLE: readonly Role[] = [MEMBER, PROSPECT, HANGAROUND];

/** Welche Ränge ein Rang beim Anlegen oder Ändern vergeben darf. */
export function assignableRoles(editor: Role, allRoles: readonly Role[]): Role[] {
  if (editor === PRESIDENT) return [...allRoles];
  if (editor === VICE_PRESIDENT) return allRoles.filter((r) => r !== PRESIDENT);
  if (editor === IT) return allRoles.filter((r) => IT_ASSIGNABLE.includes(r));
  return [];
}

/** Darf `editor` das Konto eines Mitglieds mit Rang `target` bearbeiten (Stammdaten, Passwort, Status)? */
export function canEditMember(editor: Role, target: Role) {
  if (editor === PRESIDENT) return true;
  if (editor === VICE_PRESIDENT) return target !== PRESIDENT;
  // IT verwaltet nur Konten ohne Officer-Rang, damit niemand über IT an einen Officer-Account kommt.
  if (editor === IT) return !isOfficer(target);
  return false;
}

/** Darf `editor` Ränge ändern? (IT nicht) */
export function canChangeRanks(editor: Role) {
  return can(editor, "members.manage");
}
