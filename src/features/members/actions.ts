"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/labels";
import { formToObject } from "@/lib/validation";
import { collectChanges, describeChanges, logActivity } from "@/features/activity/log";
import { hashPassword } from "@/features/auth/password";
import { can, SPONSOR_ROLES } from "@/features/auth/permissions";
import { destroyAllSessionsOf, requireUser } from "@/features/auth/session";
import { createMemberSchema, memberSchema, resetPasswordSchema } from "./schemas";

/** Prüft den Sponsor: muss existieren, mindestens Fullpatch sein und darf nicht das Mitglied selbst sein. */
async function checkSponsor(sponsorId: string | null, memberId?: string) {
  if (!sponsorId) return { ok: true as const, label: null };
  if (sponsorId === memberId) return { ok: false as const, error: "Niemand kann sein eigener Sponsor sein." };
  const sponsor = await db.user.findUnique({ where: { id: sponsorId }, select: { name: true, roadName: true, role: true } });
  if (!sponsor || !SPONSOR_ROLES.includes(sponsor.role)) {
    return { ok: false as const, error: "Sponsor muss ein Fullpatch oder Officer sein." };
  }
  return { ok: true as const, label: sponsor.roadName ?? sponsor.name };
}

async function sponsorLabel(sponsorId: string | null) {
  if (!sponsorId) return null;
  const sponsor = await db.user.findUnique({ where: { id: sponsorId }, select: { name: true, roadName: true } });
  return sponsor ? (sponsor.roadName ?? sponsor.name) : null;
}

export async function createMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "members.manage")) return noPermission();

  const parsed = createMemberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  if (data.role === "PRESIDENT" && user.role !== "PRESIDENT") {
    return actionError("Nur der President kann den Rang President vergeben.", { role: ["Nicht erlaubt."] });
  }
  if (await db.user.findUnique({ where: { username: data.username } })) {
    return actionError("Dieser Benutzername ist schon vergeben.", { username: ["Bereits vergeben."] });
  }
  const sponsorCheck = await checkSponsor(data.sponsorId);
  if (!sponsorCheck.ok) return actionError(sponsorCheck.error, { sponsorId: [sponsorCheck.error] });

  const member = await db.user.create({
    data: {
      username: data.username,
      name: data.name,
      roadName: data.roadName,
      role: data.role,
      joinedAt: data.joinedAt,
      notes: data.notes,
      sponsorId: data.sponsorId,
      active: data.active,
      passwordHash: await hashPassword(data.password),
    },
  });

  await logActivity({
    userId: user.id,
    action: "member.create",
    entityType: "MEMBER",
    entityId: member.id,
    summary: `Mitglied „${member.name}“ als ${ROLE_LABELS[member.role]} aufgenommen`,
  });

  revalidatePath("/mitglieder");
  redirect(`/mitglieder/${member.id}`);
}

export async function updateMemberAction(memberId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "members.manage")) return noPermission();

  const member = await db.user.findUnique({ where: { id: memberId } });
  if (!member) return actionError("Mitglied nicht gefunden.");

  const parsed = memberSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  const isSelf = member.id === user.id;
  if (member.role === "PRESIDENT" && user.role !== "PRESIDENT") {
    return actionError("Nur der President kann das Konto eines Presidents bearbeiten.");
  }
  if (data.role === "PRESIDENT" && member.role !== "PRESIDENT" && user.role !== "PRESIDENT") {
    return actionError("Nur der President kann den Rang President vergeben.", { role: ["Nicht erlaubt."] });
  }
  if (isSelf && data.role !== member.role) {
    return actionError("Du kannst deinen eigenen Rang nicht ändern.", { role: ["Eigener Rang ist gesperrt."] });
  }
  if (isSelf && !data.active) {
    return actionError("Du kannst dich nicht selbst deaktivieren.", { active: ["Nicht möglich."] });
  }
  if (data.username !== member.username && (await db.user.findUnique({ where: { username: data.username } }))) {
    return actionError("Dieser Benutzername ist schon vergeben.", { username: ["Bereits vergeben."] });
  }
  const sponsorCheck = await checkSponsor(data.sponsorId, member.id);
  if (!sponsorCheck.ok) return actionError(sponsorCheck.error, { sponsorId: [sponsorCheck.error] });

  await db.user.update({ where: { id: member.id }, data });

  const changes = collectChanges({
    Benutzername: [member.username, data.username],
    Name: [member.name, data.name],
    "Road Name": [member.roadName, data.roadName],
    Rang: [ROLE_LABELS[member.role], ROLE_LABELS[data.role]],
    Beitritt: [formatDate(member.joinedAt), formatDate(data.joinedAt)],
    Status: [member.active ? "aktiv" : "inaktiv", data.active ? "aktiv" : "inaktiv"],
    Sponsor: [await sponsorLabel(member.sponsorId), sponsorCheck.label],
    Notizen: [member.notes, data.notes],
  });

  if (Object.keys(changes).length > 0) {
    let summary = `Mitglied „${data.name}“ bearbeitet: ${describeChanges(changes)}`;
    if (changes.Rang) summary = `Rang von „${data.name}“ geändert: ${changes.Rang[0]} → ${changes.Rang[1]}`;
    if (changes.Status && Object.keys(changes).length === 1) {
      summary = `Mitglied „${data.name}“ ${data.active ? "reaktiviert" : "deaktiviert"}`;
    }
    await logActivity({
      userId: user.id,
      action: changes.Rang ? "member.role" : "member.update",
      entityType: "MEMBER",
      entityId: member.id,
      summary,
      changes,
    });
  }

  // Deaktivierte Mitglieder sofort abmelden.
  if (!data.active && member.active) await destroyAllSessionsOf(member.id);

  revalidatePath("/mitglieder");
  revalidatePath(`/mitglieder/${member.id}`);
  return actionSuccess("Änderungen gespeichert.");
}

export async function resetMemberPasswordAction(
  memberId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "members.manage")) return noPermission();

  const member = await db.user.findUnique({ where: { id: memberId } });
  if (!member) return actionError("Mitglied nicht gefunden.");
  if (member.role === "PRESIDENT" && user.role !== "PRESIDENT") {
    return actionError("Nur der President kann das Passwort eines Presidents zurücksetzen.");
  }

  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  await db.user.update({ where: { id: member.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await destroyAllSessionsOf(member.id, member.id === user.id);
  await logActivity({
    userId: user.id,
    action: "member.password",
    entityType: "MEMBER",
    entityId: member.id,
    summary: `Passwort von „${member.name}“ zurückgesetzt`,
  });

  return actionSuccess("Neues Passwort gesetzt. Das Mitglied wurde auf allen Geräten abgemeldet.");
}
