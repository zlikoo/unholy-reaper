"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { ROLE_LABELS, ROLES } from "@/lib/labels";
import { collectChanges, describeChanges, logActivity } from "@/features/activity/log";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { canAccessLocker } from "./access";
import { lockerFormInput, lockerSchema } from "./schemas";

const rolesText = (roles: readonly string[]) =>
  ROLES.filter((r) => roles.includes(r))
    .map((r) => ROLE_LABELS[r])
    .join(", ");

function revalidateLockers(id?: string) {
  revalidatePath("/schliessfaecher");
  if (id) revalidatePath(`/schliessfaecher/${id}`);
  revalidatePath("/waffenlager");
}

export async function createLockerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "lockers.manage")) return noPermission();

  const parsed = lockerSchema.safeParse(lockerFormInput(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (!(data.roles as Role[]).includes(user.role)) {
    return actionError("Dein eigener Rang muss Zugriff behalten.", { roles: ["Eigenen Rang anhaken."] });
  }

  const locker = await db.locker.create({
    data: {
      name: data.name,
      number: data.number,
      location: data.location,
      notes: data.notes,
      codeEncrypted: data.code ? encryptSecret(data.code) : null,
      passwordEncrypted: data.password ? encryptSecret(data.password) : null,
      access: { create: data.roles.map((role) => ({ role })) },
    },
  });
  await logActivity({
    userId: user.id,
    action: "locker.create",
    entityType: "LOCKER",
    entityId: locker.id,
    summary: `Schließfach „${locker.name}“ angelegt, Zugriff: ${rolesText(data.roles)}`,
  });

  revalidateLockers();
  redirect(`/schliessfaecher/${locker.id}`);
}

export async function updateLockerAction(lockerId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "lockers.manage")) return noPermission();
  if (!(await canAccessLocker(user.role, lockerId))) return actionError("Schließfach nicht gefunden.");

  const locker = await db.locker.findUniqueOrThrow({ where: { id: lockerId }, include: { access: true } });
  const parsed = lockerSchema.safeParse(lockerFormInput(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;
  if (!(data.roles as Role[]).includes(user.role)) {
    return actionError("Du kannst deinem eigenen Rang den Zugriff nicht entziehen.", { roles: ["Eigenen Rang anhaken."] });
  }

  const codeEncrypted = data.clearCode ? null : data.code ? encryptSecret(data.code) : locker.codeEncrypted;
  const passwordEncrypted = data.clearPassword
    ? null
    : data.password
      ? encryptSecret(data.password)
      : locker.passwordEncrypted;

  await db.$transaction([
    db.locker.update({
      where: { id: locker.id },
      data: { name: data.name, number: data.number, location: data.location, notes: data.notes, codeEncrypted, passwordEncrypted },
    }),
    db.lockerAccess.deleteMany({ where: { lockerId: locker.id } }),
    db.lockerAccess.createMany({ data: data.roles.map((role) => ({ lockerId: locker.id, role })) }),
  ]);

  // Code und Passwort selbst landen nie im Log, nur die Tatsache der Änderung.
  const changes = collectChanges({
    Bezeichnung: [locker.name, data.name],
    Fachnummer: [locker.number, data.number],
    Standort: [locker.location, data.location],
    Notizen: [locker.notes, data.notes],
    Zugriff: [rolesText(locker.access.map((a) => a.role)), rolesText(data.roles)],
  });
  if (codeEncrypted !== locker.codeEncrypted) changes["Zahlenschloss-Code"] = [locker.codeEncrypted ? "gesetzt" : "–", codeEncrypted ? "geändert" : "entfernt"];
  if (passwordEncrypted !== locker.passwordEncrypted) changes.Passwort = [locker.passwordEncrypted ? "gesetzt" : "–", passwordEncrypted ? "geändert" : "entfernt"];

  if (Object.keys(changes).length > 0) {
    await logActivity({
      userId: user.id,
      action: "locker.update",
      entityType: "LOCKER",
      entityId: locker.id,
      summary: `Schließfach „${data.name}“ bearbeitet: ${describeChanges(changes)}`,
      changes,
    });
  }

  revalidateLockers(locker.id);
  return actionSuccess("Schließfach gespeichert.");
}

export async function deleteLockerAction(lockerId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "lockers.manage")) return noPermission();
  if (!(await canAccessLocker(user.role, lockerId))) return actionError("Schließfach nicht gefunden.");

  const locker = await db.locker.findUniqueOrThrow({ where: { id: lockerId }, include: { _count: { select: { weapons: true } } } });
  if (locker._count.weapons > 0) return actionError("Das Fach ist nicht leer. Bitte zuerst alle Posten umlagern oder ausgeben.");

  await db.locker.delete({ where: { id: locker.id } });
  await logActivity({
    userId: user.id,
    action: "locker.delete",
    entityType: "LOCKER",
    entityId: locker.id,
    summary: `Schließfach „${locker.name}“ gelöscht`,
  });

  revalidateLockers();
  redirect("/schliessfaecher");
}

export type RevealResult = { ok: true; code: string | null; password: string | null } | { ok: false; error: string };

/** Entschlüsselt Code und Passwort für berechtigte Mitglieder. Jeder Abruf wird protokolliert. */
export async function revealLockerSecretsAction(lockerId: string): Promise<RevealResult> {
  const user = await requireUser();
  if (!(await canAccessLocker(user.role, lockerId))) return { ok: false, error: "Kein Zugriff auf dieses Schließfach." };

  const locker = await db.locker.findUniqueOrThrow({ where: { id: lockerId } });
  let code: string | null;
  let password: string | null;
  try {
    code = decryptSecret(locker.codeEncrypted);
    password = decryptSecret(locker.passwordEncrypted);
  } catch {
    return { ok: false, error: "Entschlüsselung nicht möglich. Ist SECRET_KEY gesetzt?" };
  }
  if ((locker.codeEncrypted && !code) || (locker.passwordEncrypted && !password)) {
    return { ok: false, error: "Entschlüsselung fehlgeschlagen. Wurde SECRET_KEY geändert? Dann Code und Passwort neu eintragen." };
  }

  await logActivity({
    userId: user.id,
    action: "locker.reveal",
    entityType: "LOCKER",
    entityId: locker.id,
    summary: `Zugangsdaten von Schließfach „${locker.name}“ abgerufen`,
  });
  return { ok: true, code, password };
}
