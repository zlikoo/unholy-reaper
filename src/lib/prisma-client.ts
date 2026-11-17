import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Erzeugt einen Prisma-Client. Wird von der App (src/lib/db.ts) und von den
 * Skripten (Seed, Admin anlegen) genutzt.
 *
 * Für Postgres: `npm i @prisma/adapter-pg pg`, dann hier
 *   new PrismaPg({ connectionString: url })
 * statt PrismaBetterSqlite3 verwenden.
 */
export function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}
