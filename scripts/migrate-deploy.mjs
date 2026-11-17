// Führt "prisma migrate deploy" aus und erklärt typische Verbindungsfehler auf Deutsch.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { encoding: "utf8", shell: process.platform === "win32" });
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
const output = `${result.stdout}\n${result.stderr}`;

const hints = {
  P1000:
    "Die Datenbank lehnt Benutzername oder Passwort ab. Prüfe in Vercel DATABASE_URL und DIRECT_URL:\n" +
    "  - Passwort ohne eckige Klammern eingesetzt?\n" +
    "  - Benutzername genau postgres.<projekt-id> (mit Punkt)?\n" +
    "  - Ist es das Datenbank-Passwort (nicht das Supabase-Login)? Im Zweifel in Supabase unter\n" +
    "    Project Settings → Database → Reset database password ein neues setzen (nur Buchstaben und Zahlen)\n" +
    "    und in BEIDE Variablen eintragen. Danach Redeploy.",
  P1001: "Der Datenbank-Server ist nicht erreichbar. Host und Port in DIRECT_URL prüfen; ist das Supabase-Projekt pausiert?",
  P1003: "Die Datenbank existiert nicht. Bei Supabase heißt sie postgres (…/postgres?schema=unholy_reaper).",
  P1017: "Der Server hat die Verbindung geschlossen. Für Migrationen den Session Pooler (Port 5432) als DIRECT_URL nehmen.",
};

if (result.status !== 0) {
  const code = Object.keys(hints).find((c) => output.includes(c));
  if (code) console.error(`\n>>> ${code}: ${hints[code]}\n`);
  process.exit(result.status ?? 1);
}
