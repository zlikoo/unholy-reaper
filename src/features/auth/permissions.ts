// Rechte nach Rang. Diese Datei ist auch im Browser nutzbar (Buttons ein-/ausblenden),
// geprüft wird aber immer zusätzlich auf dem Server.
//
// Lesen: Alle ab Prospect sehen Fahrzeuge, Kasse, Waffenlager, Mitglieder und die
// Schließfächer, für die ihr Rang freigeschaltet ist. Hangarounds sind keine Mitglieder
// und sehen nur Dashboard, Schwarzes Brett (Aushänge "für alle") und die Clubregeln.
import type { PostAudience } from "@/generated/prisma/enums";
import { Role } from "@/generated/prisma/enums";

const { PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER, MEMBER, PROSPECT } = Role;

const FULL_MEMBERS = [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER, MEMBER] as const;

export const PERMISSIONS = {
  /** Club-Interna lesen: Fahrzeuge, Kasse, Waffenlager, Schließfächer, Mitglieder */
  "club.view": [...FULL_MEMBERS, PROSPECT],
  /** Fahrzeuge anlegen, bearbeiten, ein- und auslagern */
  "vehicles.edit": FULL_MEMBERS,
  /** Fahrzeuge löschen */
  "vehicles.delete": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Waffen einlagern, ausgeben, zurücknehmen, als verloren melden */
  "weapons.edit": FULL_MEMBERS,
  /** Lagerposten löschen */
  "weapons.delete": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Schließfächer anlegen, bearbeiten, Zugriff festlegen (nur für Fächer, die man selbst sehen darf) */
  "lockers.manage": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Aushänge am Schwarzen Brett veröffentlichen und eigene bearbeiten */
  "board.post": FULL_MEMBERS,
  /** Alle Aushänge bearbeiten, löschen und anpinnen */
  "board.moderate": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
  /** Clubregeln und Hierarchie-Texte pflegen (Secretary dokumentiert Clubbeschlüsse) */
  "rules.manage": [PRESIDENT, VICE_PRESIDENT, TREASURER],
  /** Kassenbuchungen anlegen und löschen */
  "treasury.edit": [PRESIDENT, VICE_PRESIDENT, TREASURER],
  /** Große Auszahlungen freigeben oder ablehnen */
  "treasury.approve": [PRESIDENT, TREASURER],
  /** Freigabegrenze ändern */
  "treasury.settings": [PRESIDENT, TREASURER],
  /** Mitglieder anlegen, Ränge ändern, aktivieren/deaktivieren */
  "members.manage": [PRESIDENT, VICE_PRESIDENT],
  /** Aktivitätslog einsehen */
  "log.view": [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Officers des Clubs (für Aushänge "nur Officers"). */
export const OFFICER_ROLES: readonly Role[] = [PRESIDENT, VICE_PRESIDENT, SERGEANT_AT_ARMS, TREASURER];

/** Ränge, die als Sponsor für Prospects und Hangarounds infrage kommen. */
export const SPONSOR_ROLES: readonly Role[] = FULL_MEMBERS;

export function isOfficer(role: Role) {
  return OFFICER_ROLES.includes(role);
}

/** Welche Aushänge ein Rang am Schwarzen Brett sieht. */
export function visibleAudiences(role: Role): PostAudience[] {
  if (role === Role.HANGAROUND) return ["ALL"];
  if (role === PROSPECT) return ["ALL", "PROSPECTS"];
  if (isOfficer(role)) return ["ALL", "PROSPECTS", "MEMBERS", "OFFICERS"];
  return ["ALL", "PROSPECTS", "MEMBERS"];
}
