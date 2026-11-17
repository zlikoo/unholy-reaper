import "server-only";
import { db } from "@/lib/db";

/** Einrichtung ist möglich, solange es noch kein Mitglied gibt. */
export async function setupAvailable() {
  return (await db.user.count()) === 0;
}

/** Ist ein Einrichtungscode nötig? Im Produktivbetrieb immer. */
export function setupCodeRequired() {
  return Boolean(process.env.SETUP_CODE) || process.env.NODE_ENV === "production";
}
