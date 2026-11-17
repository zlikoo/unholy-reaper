"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Weapon } from "@/generated/prisma/client";
import type { WeaponMovementType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { memberDisplayName } from "@/lib/labels";
import { formToObject } from "@/lib/validation";
import { collectChanges, describeChanges, logActivity } from "@/features/activity/log";
import { can } from "@/features/auth/permissions";
import { requireUser, type SessionUser } from "@/features/auth/session";
import { canAccessLocker, weaponWhere } from "@/features/lockers/access";
import { mergeIntoStock, moveQuantity } from "./inventory";
import { issueSchema, lostSchema, returnSchema, weaponCreateSchema, weaponUpdateSchema } from "./schemas";

const itemLabel = (quantity: number, weapon: { name: string; serialNumber: string | null }) =>
  `${quantity}× ${weapon.name}${weapon.serialNumber ? ` (SN ${weapon.serialNumber})` : ""}`;

async function lockerName(lockerId: string | null) {
  if (!lockerId) return null;
  const locker = await db.locker.findUnique({ where: { id: lockerId }, select: { name: true, number: true } });
  return locker ? `${locker.number ? `Fach ${locker.number} ` : ""}${locker.name}`.trim() : null;
}

/** Posten laden, aber nur, wenn der Rang ihn sehen darf. */
async function loadWeapon(user: SessionUser, weaponId: string) {
  return db.weapon.findFirst({ where: { AND: [{ id: weaponId }, weaponWhere(user.role)] } });
}

function revalidateWeapons(...ids: string[]) {
  revalidatePath("/waffenlager");
  revalidatePath("/schliessfaecher");
  revalidatePath("/");
  for (const id of ids) revalidatePath(`/waffenlager/${id}`);
}

async function recordMovement(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  data: {
    weapon: Pick<Weapon, "id" | "name" | "serialNumber">;
    type: WeaponMovementType;
    quantity: number;
    memberId: string | null;
    date: Date;
    performedById: string;
    lockerId: string | null;
    lockerName: string | null;
    note?: string | null;
  },
) {
  await tx.weaponMovement.create({
    data: {
      weaponId: data.weapon.id,
      weaponName: data.weapon.name,
      serialNumber: data.weapon.serialNumber,
      type: data.type,
      quantity: data.quantity,
      memberId: data.memberId,
      date: data.date,
      performedById: data.performedById,
      lockerId: data.lockerId,
      lockerName: data.lockerName,
      note: data.note ?? null,
    },
  });
}

// ------------------------------------------------------------------ Einlagern

export async function createWeaponAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return noPermission();

  const parsed = weaponCreateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (data.lockerId && !(await canAccessLocker(user.role, data.lockerId))) {
    return actionError("Auf dieses Schließfach hast du keinen Zugriff.", { lockerId: ["Ungültig."] });
  }
  const targetLocker = await lockerName(data.lockerId);

  const row = await db.$transaction(async (tx) => {
    const created = await tx.weapon.create({
      data: {
        name: data.name,
        serialNumber: data.serialNumber,
        quantity: data.quantity,
        lockerId: data.lockerId,
        notes: data.notes,
        status: "IN_STOCK",
      },
    });
    await recordMovement(tx, {
      weapon: created,
      type: "STOCK_IN",
      quantity: data.quantity,
      memberId: null,
      date: data.date,
      performedById: user.id,
      lockerId: data.lockerId,
      lockerName: targetLocker,
    });
    const merged = await mergeIntoStock(tx, created);
    await logActivity(
      {
        userId: user.id,
        action: "weapon.create",
        entityType: "WEAPON",
        entityId: merged.id,
        summary: `${itemLabel(data.quantity, data)} eingelagert${targetLocker ? ` in ${targetLocker}` : ""}`,
      },
      tx,
    );
    return merged;
  });

  revalidateWeapons();
  redirect(`/waffenlager/${row.id}`);
}

// ------------------------------------------------------------------ Bearbeiten

export async function updateWeaponAction(weaponId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return noPermission();
  const weapon = await loadWeapon(user, weaponId);
  if (!weapon) return actionError("Posten nicht gefunden.");

  const parsed = weaponUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  // Nur Posten im Lager liegen in einem Fach.
  const lockerId = weapon.status === "IN_STOCK" ? data.lockerId : null;
  if (lockerId && lockerId !== weapon.lockerId && !(await canAccessLocker(user.role, lockerId))) {
    return actionError("Auf dieses Schließfach hast du keinen Zugriff.", { lockerId: ["Ungültig."] });
  }

  const changes = collectChanges({
    Waffe: [weapon.name, data.name],
    Seriennummer: [weapon.serialNumber, data.serialNumber],
    Menge: [weapon.quantity, data.quantity],
    Schließfach: [await lockerName(weapon.lockerId), await lockerName(lockerId)],
    Notizen: [weapon.notes, data.notes],
  });

  const row = await db.$transaction(async (tx) => {
    const updated = await tx.weapon.update({
      where: { id: weapon.id },
      data: { name: data.name, serialNumber: data.serialNumber, quantity: data.quantity, notes: data.notes, lockerId },
    });
    if (Object.keys(changes).length > 0) {
      await logActivity(
        {
          userId: user.id,
          action: "weapon.update",
          entityType: "WEAPON",
          entityId: weapon.id,
          summary: `Posten ${data.name} bearbeitet: ${describeChanges(changes)}`,
          changes,
        },
        tx,
      );
    }
    return mergeIntoStock(tx, updated);
  });

  revalidateWeapons(weapon.id);
  if (row.id !== weapon.id) redirect(`/waffenlager/${row.id}`);
  return actionSuccess("Posten gespeichert.");
}

// ------------------------------------------------------------------ Ausgeben

export async function issueWeaponAction(weaponId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return noPermission();
  const weapon = await loadWeapon(user, weaponId);
  if (!weapon) return actionError("Posten nicht gefunden.");
  if (weapon.status !== "IN_STOCK") return actionError("Nur Posten im Lager können ausgegeben werden.");

  const parsed = issueSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (data.quantity > weapon.quantity) {
    return actionError(`Im Lager sind nur ${weapon.quantity} Stück.`, { quantity: [`Höchstens ${weapon.quantity}.`] });
  }

  const member = await db.user.findUnique({ where: { id: data.memberId } });
  if (!member || !member.active || !can(member.role, "club.view")) {
    return actionError("Ausgabe nur an aktive Mitglieder ab Prospect.", { memberId: ["Ungültig."] });
  }
  const fromLocker = await lockerName(weapon.lockerId);

  const row = await db.$transaction(async (tx) => {
    const moved = await moveQuantity(tx, weapon, data.quantity, {
      status: "ISSUED",
      holderId: member.id,
      lockerId: null,
      issuedAt: data.date,
    });
    await recordMovement(tx, {
      weapon: moved,
      type: "ISSUE",
      quantity: data.quantity,
      memberId: member.id,
      date: data.date,
      performedById: user.id,
      lockerId: weapon.lockerId,
      lockerName: fromLocker,
      note: data.note,
    });
    await logActivity(
      {
        userId: user.id,
        action: "weapon.issue",
        entityType: "WEAPON",
        entityId: moved.id,
        summary: `${itemLabel(data.quantity, weapon)} an ${memberDisplayName(member)} ausgegeben${fromLocker ? ` (aus ${fromLocker})` : ""}`,
      },
      tx,
    );
    return moved;
  });

  revalidateWeapons(weapon.id, row.id);
  redirect(`/waffenlager/${row.id}`);
}

// ------------------------------------------------------------------ Zurücknehmen

export async function returnWeaponAction(weaponId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return returnOrFind(weaponId, formData, "RETURN");
}

export async function foundWeaponAction(weaponId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  return returnOrFind(weaponId, formData, "FOUND");
}

async function returnOrFind(weaponId: string, formData: FormData, type: "RETURN" | "FOUND"): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return noPermission();
  const weapon = await loadWeapon(user, weaponId);
  if (!weapon) return actionError("Posten nicht gefunden.");
  if (type === "RETURN" && weapon.status !== "ISSUED") return actionError("Dieser Posten ist nicht ausgegeben.");
  if (type === "FOUND" && weapon.status !== "LOST") return actionError("Dieser Posten ist nicht als verloren gemeldet.");

  const parsed = returnSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (data.quantity > weapon.quantity) {
    return actionError(`Es sind nur ${weapon.quantity} Stück.`, { quantity: [`Höchstens ${weapon.quantity}.`] });
  }
  if (data.lockerId && !(await canAccessLocker(user.role, data.lockerId))) {
    return actionError("Auf dieses Schließfach hast du keinen Zugriff.", { lockerId: ["Ungültig."] });
  }

  const holder = weapon.holderId
    ? await db.user.findUnique({ where: { id: weapon.holderId }, select: { name: true, roadName: true } })
    : null;
  const targetLocker = await lockerName(data.lockerId);

  const row = await db.$transaction(async (tx) => {
    const moved = await moveQuantity(tx, weapon, data.quantity, {
      status: "IN_STOCK",
      holderId: null,
      lockerId: data.lockerId,
      issuedAt: null,
    });
    await recordMovement(tx, {
      weapon: moved,
      type,
      quantity: data.quantity,
      memberId: weapon.holderId,
      date: data.date,
      performedById: user.id,
      lockerId: data.lockerId,
      lockerName: targetLocker,
      note: data.note,
    });
    const what = itemLabel(data.quantity, weapon);
    await logActivity(
      {
        userId: user.id,
        action: type === "RETURN" ? "weapon.return" : "weapon.found",
        entityType: "WEAPON",
        entityId: moved.id,
        summary:
          type === "RETURN"
            ? `${what} von ${holder ? memberDisplayName(holder) : "unbekannt"} zurückgenommen${targetLocker ? ` in ${targetLocker}` : ""}`
            : `${what} wiedergefunden${targetLocker ? `, eingelagert in ${targetLocker}` : ""}`,
      },
      tx,
    );
    return moved;
  });

  revalidateWeapons(weapon.id, row.id);
  redirect(`/waffenlager/${row.id}`);
}

// ------------------------------------------------------------------ Verloren

export async function lostWeaponAction(weaponId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.edit")) return noPermission();
  const weapon = await loadWeapon(user, weaponId);
  if (!weapon) return actionError("Posten nicht gefunden.");
  if (weapon.status === "LOST") return actionError("Dieser Posten ist bereits als verloren gemeldet.");

  const parsed = lostSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (data.quantity > weapon.quantity) {
    return actionError(`Es sind nur ${weapon.quantity} Stück.`, { quantity: [`Höchstens ${weapon.quantity}.`] });
  }

  const holder = weapon.holderId
    ? await db.user.findUnique({ where: { id: weapon.holderId }, select: { name: true, roadName: true } })
    : null;
  const fromLocker = await lockerName(weapon.lockerId);

  const row = await db.$transaction(async (tx) => {
    const moved = await moveQuantity(tx, weapon, data.quantity, {
      status: "LOST",
      holderId: weapon.holderId,
      lockerId: null,
      issuedAt: weapon.issuedAt,
    });
    await recordMovement(tx, {
      weapon: moved,
      type: "LOST",
      quantity: data.quantity,
      memberId: weapon.holderId,
      date: data.date,
      performedById: user.id,
      lockerId: weapon.lockerId,
      lockerName: fromLocker,
      note: data.note,
    });
    await logActivity(
      {
        userId: user.id,
        action: "weapon.lost",
        entityType: "WEAPON",
        entityId: moved.id,
        summary: `${itemLabel(data.quantity, weapon)} als verloren gemeldet${holder ? ` (zuletzt bei ${memberDisplayName(holder)})` : fromLocker ? ` (aus ${fromLocker})` : ""}${data.note ? `: ${data.note}` : ""}`,
      },
      tx,
    );
    return moved;
  });

  revalidateWeapons(weapon.id, row.id);
  redirect(`/waffenlager/${row.id}`);
}

// ------------------------------------------------------------------ Löschen

export async function deleteWeaponAction(weaponId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "weapons.delete")) return noPermission();
  const weapon = await loadWeapon(user, weaponId);
  if (!weapon) return actionError("Posten nicht gefunden.");

  await db.weapon.delete({ where: { id: weapon.id } });
  await logActivity({
    userId: user.id,
    action: "weapon.delete",
    entityType: "WEAPON",
    entityId: weapon.id,
    summary: `Posten ${itemLabel(weapon.quantity, weapon)} gelöscht`,
  });

  revalidateWeapons();
  redirect("/waffenlager");
}
