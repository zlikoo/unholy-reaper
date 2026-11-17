// Welche Datenbank genutzt wird, ergibt sich aus der Verbindungs-URL:
//   file:…              → SQLite (lokal)
//   postgres(ql)://…    → Postgres (z. B. Neon auf Vercel)
// Diese Datei wird von prisma.config.ts, dem Prisma-Client und den Skripten genutzt.

/** Verbindung für die laufende App (bei Neon die gepoolte URL). */
export function runtimeDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "file:./prisma/dev.db";
  // Prisma-Postgres-Integrationen liefern teils eine prisma+postgres://-URL; dann die direkte URL nehmen.
  if (url.startsWith("prisma+postgres://") && process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  return url;
}

/** Verbindung für Migrationen (bei Neon die direkte, ungepoolte URL). */
export function migrationDatabaseUrl() {
  return (
    process.env.DIRECT_DATABASE_URL ??
    process.env.DIRECT_URL ?? // so heißt sie in Supabase unter Connect → ORMs → Prisma
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    runtimeDatabaseUrl()
  );
}

export function isPostgresUrl(url: string) {
  return /^postgres(ql)?:\/\//.test(url);
}

export const isPostgres = isPostgresUrl(runtimeDatabaseUrl());
