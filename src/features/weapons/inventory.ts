import "server-only";
import type { Prisma, Weapon } from "@/generated/prisma/client";
import type { WeaponStatus } from "@/generated/prisma/enums";

type Tx = Prisma.TransactionClient;

type Target = {
  status: WeaponStatus;
  holderId: string | null;
  lockerId: string | null;
  issuedAt: Date | null;
};

/**
 * Führt einen Lagerposten mit einem gleichartigen Posten im selben Fach zusammen
 * (gleiche Waffe, gleiche Seriennummer, Status "im Lager"). Die Historie wandert mit.
 */
async function mergeIntoStock(tx: Tx, row: Weapon): Promise<Weapon> {
  if (row.status !== "IN_STOCK") return row;
  const existing = await tx.weapon.findFirst({
    where: {
      id: { not: row.id },
      status: "IN_STOCK",
      name: row.name,
      serialNumber: row.serialNumber,
      lockerId: row.lockerId,
    },
  });
  if (!existing) return row;
  await tx.weaponMovement.updateMany({ where: { weaponId: row.id }, data: { weaponId: existing.id } });
  const merged = await tx.weapon.update({
    where: { id: existing.id },
    data: { quantity: { increment: row.quantity } },
  });
  await tx.weapon.delete({ where: { id: row.id } });
  return merged;
}

/**
 * Verschiebt `quantity` Stück eines Postens in einen neuen Zustand
 * (z. B. Lager → ausgegeben). Bei einer Teilmenge wird der Posten aufgeteilt.
 * Gibt den Posten zurück, in dem die verschobenen Stücke jetzt liegen.
 */
export async function moveQuantity(tx: Tx, weapon: Weapon, quantity: number, target: Target): Promise<Weapon> {
  if (quantity > weapon.quantity) throw new Error("Menge zu groß");

  if (quantity === weapon.quantity) {
    const updated = await tx.weapon.update({ where: { id: weapon.id }, data: target });
    return mergeIntoStock(tx, updated);
  }

  await tx.weapon.update({ where: { id: weapon.id }, data: { quantity: { decrement: quantity } } });
  const created = await tx.weapon.create({
    data: {
      name: weapon.name,
      serialNumber: weapon.serialNumber,
      notes: weapon.notes,
      quantity,
      ...target,
    },
  });
  return mergeIntoStock(tx, created);
}

export { mergeIntoStock };
