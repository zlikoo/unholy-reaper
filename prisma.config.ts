import "dotenv/config";
import { defineConfig } from "prisma/config";
import { isPostgresUrl, migrationDatabaseUrl, runtimeDatabaseUrl } from "./src/lib/db-provider";

// Lokal: SQLite (prisma/schema.prisma). Mit einer postgres://-URL (z. B. auf Vercel):
// die erzeugte Postgres-Variante mit eigenen Migrationen in prisma/postgres/.
const postgres = isPostgresUrl(runtimeDatabaseUrl());

export default defineConfig({
  schema: postgres ? "prisma/postgres/schema.prisma" : "prisma/schema.prisma",
  migrations: {
    path: postgres ? "prisma/postgres/migrations" : "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl(),
  },
});
