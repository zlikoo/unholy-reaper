import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { can } from "@/features/auth/permissions";

// Sichtbarkeit von Schließfächern: Der President sieht alle Fächer, alle anderen nur
// Fächer, die für ihren Rang freigeschaltet sind. Hangarounds sehen keine.
// Waffen, die in einem unsichtbaren Fach liegen, sind ebenfalls unsichtbar.
// Ausgegebene oder verlorene Waffen liegen in keinem Fach und sind für alle Mitglieder sichtbar.

export function lockerWhere(role: Role): Prisma.LockerWhereInput {
  if (!can(role, "club.view")) return { id: "__none__" };
  if (role === "PRESIDENT") return {};
  return { access: { some: { role } } };
}

export function weaponWhere(role: Role): Prisma.WeaponWhereInput {
  if (!can(role, "club.view")) return { id: "__none__" };
  if (role === "PRESIDENT") return {};
  return { OR: [{ lockerId: null }, { locker: { is: { access: { some: { role } } } } }] };
}

export function movementWhere(role: Role): Prisma.WeaponMovementWhereInput {
  if (!can(role, "club.view")) return { id: "__none__" };
  if (role === "PRESIDENT") return {};
  return { OR: [{ lockerId: null }, { locker: { is: { access: { some: { role } } } } }] };
}

export async function canAccessLocker(role: Role, lockerId: string) {
  const locker = await db.locker.findFirst({ where: { AND: [{ id: lockerId }, lockerWhere(role)] }, select: { id: true } });
  return Boolean(locker);
}

export type LockerOption = { id: string; label: string };

/** Schließfächer, die der Rang sehen darf, für Auswahlfelder. */
export async function getLockerOptions(role: Role): Promise<LockerOption[]> {
  const lockers = await db.locker.findMany({
    where: lockerWhere(role),
    select: { id: true, name: true, number: true, location: true },
    orderBy: [{ number: "asc" }, { name: "asc" }],
  });
  return lockers.map((l) => ({
    id: l.id,
    label: `${l.number ? `Fach ${l.number} · ` : ""}${l.name}${l.location ? ` (${l.location})` : ""}`,
  }));
}
