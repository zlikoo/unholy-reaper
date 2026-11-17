import "server-only";
import { db } from "@/lib/db";

export const APPROVAL_THRESHOLD_KEY = "treasury.approvalThreshold";
export const DEFAULT_APPROVAL_THRESHOLD = 10000;

/** Auszahlungen ÜBER diesem Betrag brauchen eine Freigabe. */
export async function getApprovalThreshold() {
  const setting = await db.setting.findUnique({ where: { key: APPROVAL_THRESHOLD_KEY } });
  const value = Number.parseInt(setting?.value ?? "", 10);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_APPROVAL_THRESHOLD;
}
