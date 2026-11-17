// Prüft vor dem Vercel-Build, ob alle nötigen Umgebungsvariablen gesetzt und plausibel sind.
// Passwörter werden dabei nie ausgegeben, nur maskiert.

import "dotenv/config";

const problems = [];
const warnings = [];

/** URL zur Anzeige im Log: Passwort durch **** ersetzt. */
function mask(raw) {
  return raw.replace(/^(\w+:\/\/[^:/@]+:)([^@]*)(@)/, (_, a, pw, c) => `${a}${pw ? "****" : "(leer)"}${c}`);
}

function checkPostgresUrl(name, raw, { forMigrations }) {
  if (!raw) {
    problems.push(`${name} fehlt.`);
    return;
  }
  const value = raw.trim();
  if (value !== raw) warnings.push(`${name} hat Leerzeichen am Anfang oder Ende (werden ignoriert).`);
  if (/^["']|["']$/.test(value)) problems.push(`${name} steht in Anführungszeichen. Bitte ohne " oder ' eintragen.`);
  if (!/^postgres(ql)?:\/\//.test(value.replace(/^["']/, ""))) {
    problems.push(`${name} muss mit postgresql:// beginnen.`);
    return;
  }
  if (/[[\]]/.test(value)) problems.push(`${name} enthält eckige Klammern [ ]. Die gehören nicht zum Passwort, bitte entfernen.`);
  if (/YOUR-PASSWORD|DEIN-PASSWORT|NEUESPASSWORT|PASSWORD\]/i.test(value)) {
    problems.push(`${name} enthält noch einen Platzhalter statt des echten Datenbank-Passworts.`);
  }
  const authority = value.replace(/^\w+:\/\//, "").split("/")[0];
  if ((authority.match(/@/g) ?? []).length > 1) {
    problems.push(`${name}: Das Passwort enthält ein @. Bitte in Supabase ein Passwort nur aus Buchstaben und Zahlen setzen.`);
  }

  let url;
  try {
    url = new URL(value.replace(/^["']|["']$/g, ""));
  } catch {
    problems.push(`${name} ist keine gültige URL (oft wegen Sonderzeichen im Passwort wie # / ? %): ${mask(value)}`);
    return;
  }

  const user = decodeURIComponent(url.username);
  const host = url.hostname;
  const port = url.port || "5432";
  if (!url.password) problems.push(`${name}: Passwort fehlt.`);
  if (host.endsWith("pooler.supabase.com") && !user.includes(".")) {
    problems.push(`${name}: Der Benutzername muss bei Supabase "postgres.<projekt-id>" lauten (mit Punkt), nicht nur "${user}".`);
  }
  if (forMigrations && port === "6543") {
    problems.push(`${name} zeigt auf Port 6543 (Transaction Pooler). Für Migrationen bitte den Session Pooler mit Port 5432 nehmen.`);
  }
  if (!forMigrations && host.endsWith("pooler.supabase.com") && port === "6543" && url.searchParams.get("pgbouncer") !== "true") {
    warnings.push(`${name}: Beim Transaction Pooler (Port 6543) sollte ?pgbouncer=true angehängt sein.`);
  }
  if (!url.searchParams.get("schema")) {
    warnings.push(`${name} hat kein ?schema=… – die Tabellen landen dann im Schema "public".`);
  }
  console.log(`${name}: ${mask(value)}`);
}

const runtimeUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const directName = ["DIRECT_DATABASE_URL", "DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"].find((n) => process.env[n]);

checkPostgresUrl("DATABASE_URL", runtimeUrl, { forMigrations: false });
if (directName) checkPostgresUrl(directName, process.env[directName], { forMigrations: true });
else warnings.push("Keine DIRECT_URL gesetzt: Migrationen laufen über DATABASE_URL. Bei Supabase besser den Session Pooler als DIRECT_URL eintragen.");

if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 24) problems.push("SECRET_KEY fehlt oder ist kürzer als 24 Zeichen.");
if (!process.env.SETUP_CODE) problems.push("SETUP_CODE fehlt (Code für die Ersteinrichtung unter /setup).");

for (const warning of warnings) console.warn(`Hinweis: ${warning}`);
if (problems.length > 0) {
  console.error("\nVercel-Build abgebrochen, bitte die Umgebungsvariablen korrigieren:\n- " + problems.join("\n- ") + "\nSiehe README, Abschnitt „Deployment auf Vercel“.\n");
  process.exit(1);
}
console.log("Umgebungsvariablen für das Deployment sind vollständig.");
