import { isPostgres } from "./db-provider";

/**
 * Textsuche ohne Rücksicht auf Groß-/Kleinschreibung.
 * SQLite vergleicht bei LIKE ohnehin so; Postgres braucht mode: "insensitive",
 * das der SQLite-Client nicht kennt. Daher die Typumwandlung.
 */
export function textContains(query: string) {
  return (isPostgres ? { contains: query, mode: "insensitive" } : { contains: query }) as { contains: string };
}
