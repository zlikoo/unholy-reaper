// Deutsche Bezeichnungen für alle Enum-Werte. Darf auch in Client-Komponenten genutzt werden.
import {
  PostAudience,
  PostCategory,
  Role,
  RuleSection,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
  VehicleStatus,
  VehicleType,
  WeaponMovementType,
  WeaponStatus,
} from "@/generated/prisma/enums";

export type BadgeTone = "red" | "green" | "amber" | "zinc" | "brass" | "blue" | "bone" | "violet";

/** Ränge in absteigender Reihenfolge. */
export const ROLES: Role[] = [
  Role.PRESIDENT,
  Role.VICE_PRESIDENT,
  Role.SERGEANT_AT_ARMS,
  Role.TREASURER,
  Role.ROAD_CAPTAIN,
  Role.IT,
  Role.MEMBER,
  Role.PROSPECT,
  Role.HANGAROUND,
];

export const ROLE_LABELS: Record<Role, string> = {
  PRESIDENT: "President",
  VICE_PRESIDENT: "Vice President",
  SERGEANT_AT_ARMS: "Sergeant at Arms",
  TREASURER: "Secretary / Treasurer",
  ROAD_CAPTAIN: "Road Captain",
  IT: "IT",
  MEMBER: "Fullpatch",
  PROSPECT: "Prospect",
  HANGAROUND: "Hangaround",
};

export const ROLE_TONES: Record<Role, BadgeTone> = {
  PRESIDENT: "red",
  VICE_PRESIDENT: "red",
  SERGEANT_AT_ARMS: "brass",
  TREASURER: "brass",
  ROAD_CAPTAIN: "brass",
  IT: "violet",
  MEMBER: "bone",
  PROSPECT: "blue",
  HANGAROUND: "zinc",
};

export const VEHICLE_TYPES: VehicleType[] = [VehicleType.MOTORCYCLE, VehicleType.CAR, VehicleType.OTHER];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: "Motorrad",
  CAR: "Auto",
  OTHER: "Sonstiges",
};

export const VEHICLE_STATUSES: VehicleStatus[] = [
  VehicleStatus.IN_GARAGE,
  VehicleStatus.ON_ROAD,
  VehicleStatus.DAMAGED,
  VehicleStatus.IMPOUNDED,
];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  IN_GARAGE: "In Garage",
  ON_ROAD: "Unterwegs",
  DAMAGED: "Defekt",
  IMPOUNDED: "Beschlagnahmt",
};

export const VEHICLE_STATUS_TONES: Record<VehicleStatus, BadgeTone> = {
  IN_GARAGE: "green",
  ON_ROAD: "blue",
  DAMAGED: "amber",
  IMPOUNDED: "red",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Einzahlung",
  WITHDRAWAL: "Auszahlung",
};

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  TransactionCategory.DONATION,
  TransactionCategory.SALE,
  TransactionCategory.WEAPONS,
  TransactionCategory.VEHICLES,
  TransactionCategory.OTHER,
];

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  DONATION: "Spende",
  SALE: "Verkauf",
  WEAPONS: "Waffen",
  VEHICLES: "Fahrzeuge",
  OTHER: "Sonstiges",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  APPROVED: "Gebucht",
  PENDING: "Wartet auf Freigabe",
  REJECTED: "Abgelehnt",
};

export const TRANSACTION_STATUS_TONES: Record<TransactionStatus, BadgeTone> = {
  APPROVED: "green",
  PENDING: "amber",
  REJECTED: "zinc",
};

export const WEAPON_STATUSES: WeaponStatus[] = [WeaponStatus.IN_STOCK, WeaponStatus.ISSUED, WeaponStatus.LOST];

export const WEAPON_STATUS_LABELS: Record<WeaponStatus, string> = {
  IN_STOCK: "Im Lager",
  ISSUED: "Ausgegeben",
  LOST: "Verloren",
};

export const WEAPON_STATUS_TONES: Record<WeaponStatus, BadgeTone> = {
  IN_STOCK: "green",
  ISSUED: "brass",
  LOST: "red",
};

export const WEAPON_MOVEMENT_LABELS: Record<WeaponMovementType, string> = {
  STOCK_IN: "Eingelagert",
  ISSUE: "Ausgegeben",
  RETURN: "Zurückgegeben",
  LOST: "Als verloren gemeldet",
  FOUND: "Wiedergefunden",
};

export const POST_CATEGORIES: PostCategory[] = [
  PostCategory.INFO,
  PostCategory.IMPORTANT,
  PostCategory.EVENT,
  PostCategory.RIDE,
  PostCategory.OTHER,
];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  INFO: "Info",
  IMPORTANT: "Wichtig",
  EVENT: "Termin",
  RIDE: "Ausfahrt",
  OTHER: "Sonstiges",
};

export const POST_CATEGORY_TONES: Record<PostCategory, BadgeTone> = {
  INFO: "zinc",
  IMPORTANT: "red",
  EVENT: "brass",
  RIDE: "blue",
  OTHER: "zinc",
};

export const POST_AUDIENCES: PostAudience[] = [
  PostAudience.ALL,
  PostAudience.PROSPECTS,
  PostAudience.MEMBERS,
  PostAudience.OFFICERS,
];

export const POST_AUDIENCE_LABELS: Record<PostAudience, string> = {
  ALL: "Alle (inkl. Hangarounds)",
  PROSPECTS: "Ab Prospect",
  MEMBERS: "Ab Fullpatch",
  OFFICERS: "Nur Officers",
};

export const RULE_SECTIONS: RuleSection[] = [
  RuleSection.CLUB_RULES,
  RuleSection.HIERARCHY,
  RuleSection.HANGAROUND,
  RuleSection.PROSPECT,
];

export const RULE_SECTION_LABELS: Record<RuleSection, string> = {
  CLUB_RULES: "Clubregeln",
  HIERARCHY: "Hierarchie des Clubs",
  HANGAROUND: "Regeln für Hangarounds",
  PROSPECT: "Regeln für Prospects",
};

export const LOG_ENTITIES = ["TRANSACTION", "VEHICLE", "WEAPON", "LOCKER", "MEMBER", "POST", "RULES", "SETTINGS"] as const;
export type LogEntity = (typeof LOG_ENTITIES)[number];

export const LOG_ENTITY_LABELS: Record<LogEntity, string> = {
  TRANSACTION: "Kasse",
  VEHICLE: "Fahrzeuge",
  WEAPON: "Waffenlager",
  LOCKER: "Schließfächer",
  MEMBER: "Mitglieder",
  POST: "Schwarzes Brett",
  RULES: "Clubregeln",
  SETTINGS: "Einstellungen",
};

/** Anzeigename eines Mitglieds: Name "Road Name" */
export function memberDisplayName(member: { name: string; roadName?: string | null }) {
  return member.roadName ? `${member.name} „${member.roadName}“` : member.name;
}
