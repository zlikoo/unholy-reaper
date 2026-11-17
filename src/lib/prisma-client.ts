import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isPostgresUrl, runtimeDatabaseUrl } from "./db-provider";

/**
 * Erzeugt einen Prisma-Client. Wird von der App (src/lib/db.ts) und von den
 * Skripten (Seed, Admin anlegen) genutzt. Der Adapter richtet sich nach der URL:
 * SQLite lokal, Postgres (z. B. Supabase oder Neon) auf Vercel.
 *
 * Postgres-URLs dürfen "?schema=unholy_reaper" enthalten. Dann liegen alle Tabellen in
 * diesem Schema, und die App kann eine bestehende Datenbank (etwa ein vorhandenes
 * Supabase-Projekt) mitbenutzen, ohne mit dessen Tabellen zu kollidieren.
 */
export function createPrismaClient() {
  const url = runtimeDatabaseUrl();
  if (!isPostgresUrl(url)) return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

  const parsed = new URL(url);
  const schema = parsed.searchParams.get("schema") ?? undefined;
  parsed.searchParams.delete("schema");
  const adapter = new PrismaPg({ connectionString: parsed.toString() }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}
