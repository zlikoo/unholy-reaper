import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { dayKey, startOfDayDaysAgo } from "@/lib/dates";
import { formatShortDate, formatDate } from "@/lib/format";

type Client = Prisma.TransactionClient | typeof db;

/** Kontostand aus allen gebuchten (freigegebenen) Buchungen. */
export async function getBalance(client: Client = db, where: Prisma.TransactionWhereInput = {}) {
  const sums = await client.transaction.groupBy({
    by: ["type"],
    where: { ...where, status: "APPROVED" },
    _sum: { amount: true },
  });
  const deposits = sums.find((s) => s.type === "DEPOSIT")?._sum.amount ?? 0;
  const withdrawals = sums.find((s) => s.type === "WITHDRAWAL")?._sum.amount ?? 0;
  return deposits - withdrawals;
}

export type DayPoint = {
  key: string;
  label: string;
  fullLabel: string;
  deposits: number;
  withdrawals: number;
  balance: number;
};

/** Tageswerte der letzten `days` Tage (inkl. heute) für das Diagramm. */
export async function getDailySeries(days = 30): Promise<DayPoint[]> {
  const start = startOfDayDaysAgo(days - 1);
  const [openingBalance, transactions] = await Promise.all([
    getBalance(db, { date: { lt: start } }),
    db.transaction.findMany({
      where: { status: "APPROVED", date: { gte: start } },
      select: { type: true, amount: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const byDay = new Map<string, { deposits: number; withdrawals: number }>();
  for (const t of transactions) {
    const key = dayKey(t.date);
    const entry = byDay.get(key) ?? { deposits: 0, withdrawals: 0 };
    if (t.type === "DEPOSIT") entry.deposits += t.amount;
    else entry.withdrawals += t.amount;
    byDay.set(key, entry);
  }

  const points: DayPoint[] = [];
  let balance = openingBalance;
  for (let i = days - 1; i >= 0; i--) {
    // Mittag des Tages, damit Sommer-/Winterzeit keine Rolle spielt
    const day = new Date(startOfDayDaysAgo(i).getTime() + 12 * 60 * 60 * 1000);
    const key = dayKey(day);
    const entry = byDay.get(key) ?? { deposits: 0, withdrawals: 0 };
    balance += entry.deposits - entry.withdrawals;
    points.push({ key, label: formatShortDate(day), fullLabel: formatDate(day), ...entry, balance });
  }
  return points;
}
