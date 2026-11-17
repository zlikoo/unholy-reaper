import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { LogEntity } from "@/lib/labels";

type DbClient = Prisma.TransactionClient | typeof db;

/** Änderungen als { Feldname: [alt, neu] } */
export type Changes = Record<string, [string, string]>;

type LogEntry = {
  userId: string | null;
  action: string;
  entityType: LogEntity;
  entityId?: string | null;
  summary: string;
  changes?: Changes | null;
};

/** Schreibt einen Eintrag ins Aktivitätslog. Optional innerhalb einer Transaktion. */
export async function logActivity(entry: LogEntry, client: DbClient = db) {
  const details = entry.changes && Object.keys(entry.changes).length > 0 ? JSON.stringify(entry.changes) : null;
  await client.activityLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      details,
    },
  });
}

const show = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "–";
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/**
 * Vergleicht Werte vorher/nachher und gibt nur die geänderten Felder zurück.
 * `fields`: Anzeigename → [alt, neu] (bereits für die Anzeige formatiert).
 */
export function collectChanges(fields: Record<string, [unknown, unknown]>): Changes {
  const changes: Changes = {};
  for (const [label, [before, after]] of Object.entries(fields)) {
    const a = show(before);
    const b = show(after);
    if (a !== b) changes[label] = [a, b];
  }
  return changes;
}

/** Kurztext wie "Status: In Garage → Unterwegs, Standort: – → Paleto Bay" */
export function describeChanges(changes: Changes, maxLength = 160) {
  const text = Object.entries(changes)
    .map(([label, [a, b]]) => `${label}: ${a} → ${b}`)
    .join(", ");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
