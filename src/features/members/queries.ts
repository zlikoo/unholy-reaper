import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { memberDisplayName, ROLES } from "@/lib/labels";

export type MemberOption = { id: string; label: string };

/**
 * Aktive Mitglieder für Auswahlfelder, sortiert nach Rang und Name.
 * `include`: IDs, die zusätzlich auftauchen sollen (z. B. inaktiver Besitzer eines Fahrzeugs).
 * `roles`: nur diese Ränge (Standard: alle außer Hangarounds).
 */
export async function getMemberOptions({
  include = [],
  roles = ROLES.filter((r) => r !== "HANGAROUND"),
}: { include?: Array<string | null | undefined>; roles?: readonly Role[] } = {}): Promise<MemberOption[]> {
  const extra = include.filter((id): id is string => Boolean(id));
  const members = await db.user.findMany({
    where: {
      OR: [{ active: true, role: { in: [...roles] } }, ...(extra.length ? [{ id: { in: extra } }] : [])],
    },
    select: { id: true, name: true, roadName: true, role: true, active: true },
  });
  return members
    .sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name, "de"))
    .map((m) => ({ id: m.id, label: memberDisplayName(m) + (m.active ? "" : " (inaktiv)") }));
}
