"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { actionError, actionSuccess, noPermission, validationError, type ActionState } from "@/lib/action-state";
import { formatMoney } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import { formToObject } from "@/lib/validation";
import { logActivity } from "@/features/activity/log";
import { can } from "@/features/auth/permissions";
import { requireUser } from "@/features/auth/session";
import { getBalance } from "./queries";
import { thresholdSchema, transactionSchema } from "./schemas";
import { APPROVAL_THRESHOLD_KEY, getApprovalThreshold } from "./settings";

function revalidateTreasury() {
  revalidatePath("/kasse");
  revalidatePath("/");
}

export async function createTransactionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "treasury.edit")) return noPermission();

  const parsed = transactionSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);
  const data = parsed.data;

  if (data.memberId && !(await db.user.findUnique({ where: { id: data.memberId }, select: { id: true } }))) {
    return actionError("Mitglied nicht gefunden.", { memberId: ["Ungültig."] });
  }

  const threshold = await getApprovalThreshold();
  const needsApproval = data.type === "WITHDRAWAL" && data.amount > threshold;

  const result = await db.$transaction(async (tx) => {
    // Auch freigabepflichtige Auszahlungen müssen gedeckt sein (geprüft wird erneut bei der Freigabe).
    if (data.type === "WITHDRAWAL") {
      const balance = await getBalance(tx);
      if (data.amount > balance) return { error: `Nicht genug Geld in der Kasse (Kontostand ${formatMoney(balance)}).` };
    }
    const transaction = await tx.transaction.create({
      data: { ...data, status: needsApproval ? "PENDING" : "APPROVED", createdById: user.id },
    });
    await logActivity(
      {
        userId: user.id,
        action: "transaction.create",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        summary: needsApproval
          ? `Auszahlung ${formatMoney(data.amount)} angelegt, wartet auf Freigabe: ${data.description}`
          : `${TRANSACTION_TYPE_LABELS[data.type]} ${formatMoney(data.amount)} gebucht: ${data.description}`,
      },
      tx,
    );
    return { transaction };
  });

  if ("error" in result) return actionError(result.error ?? "Fehler", { amount: ["Kontostand reicht nicht."] });

  revalidateTreasury();
  redirect(needsApproval ? "/kasse?hinweis=freigabe" : "/kasse");
}

export async function approveTransactionAction(transactionId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "treasury.approve")) return noPermission();

  const result = await db.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction || transaction.status !== "PENDING") return { error: "Diese Buchung wartet nicht auf Freigabe." };
    if (transaction.createdById === user.id) {
      return { error: "Vier-Augen-Prinzip: Die eigene Auszahlung muss jemand anderes freigeben." };
    }
    const balance = await getBalance(tx);
    if (transaction.amount > balance) {
      return { error: `Nicht genug Geld in der Kasse (Kontostand ${formatMoney(balance)}).` };
    }
    await tx.transaction.update({
      where: { id: transaction.id },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
    });
    await logActivity(
      {
        userId: user.id,
        action: "transaction.approve",
        entityType: "TRANSACTION",
        entityId: transaction.id,
        summary: `Auszahlung ${formatMoney(transaction.amount)} freigegeben: ${transaction.description}`,
      },
      tx,
    );
    return { ok: true };
  });

  if ("error" in result) return actionError(result.error ?? "Fehler");
  revalidateTreasury();
  return actionSuccess("Auszahlung freigegeben.");
}

export async function rejectTransactionAction(transactionId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "treasury.approve")) return noPermission();

  const transaction = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction || transaction.status !== "PENDING") return actionError("Diese Buchung wartet nicht auf Freigabe.");

  await db.transaction.update({
    where: { id: transaction.id },
    data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date() },
  });
  await logActivity({
    userId: user.id,
    action: "transaction.reject",
    entityType: "TRANSACTION",
    entityId: transaction.id,
    summary: `Auszahlung ${formatMoney(transaction.amount)} abgelehnt: ${transaction.description}`,
  });

  revalidateTreasury();
  return actionSuccess("Auszahlung abgelehnt.");
}

export async function deleteTransactionAction(transactionId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "treasury.edit")) return noPermission();

  const transaction = await db.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return actionError("Buchung nicht gefunden.");

  await db.transaction.delete({ where: { id: transaction.id } });
  await logActivity({
    userId: user.id,
    action: "transaction.delete",
    entityType: "TRANSACTION",
    entityId: transaction.id,
    summary: `${TRANSACTION_TYPE_LABELS[transaction.type]} ${formatMoney(transaction.amount)} gelöscht: ${transaction.description}`,
  });

  revalidateTreasury();
  return actionSuccess("Buchung gelöscht.");
}

export async function updateThresholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "treasury.settings")) return noPermission();

  const parsed = thresholdSchema.safeParse(formToObject(formData));
  if (!parsed.success) return validationError(parsed.error);

  const previous = await getApprovalThreshold();
  const threshold = parsed.data.threshold;
  if (threshold === previous) return actionSuccess("Keine Änderung.");

  await db.setting.upsert({
    where: { key: APPROVAL_THRESHOLD_KEY },
    create: { key: APPROVAL_THRESHOLD_KEY, value: String(threshold) },
    update: { value: String(threshold) },
  });
  await logActivity({
    userId: user.id,
    action: "settings.threshold",
    entityType: "SETTINGS",
    summary: `Freigabegrenze für Auszahlungen geändert: ${formatMoney(previous)} → ${formatMoney(threshold)}`,
    changes: { Freigabegrenze: [formatMoney(previous), formatMoney(threshold)] },
  });

  revalidateTreasury();
  return actionSuccess(`Freigabegrenze auf ${formatMoney(threshold)} gesetzt.`);
}
