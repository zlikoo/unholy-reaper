// Prüft vor dem Vercel-Build, ob alle nötigen Umgebungsvariablen gesetzt sind.
// Ohne Postgres würde die App sonst mit SQLite gebaut, und das funktioniert auf Vercel nicht.
const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
const problems = [];
if (!/^postgres(ql)?:\/\//.test(url)) {
  problems.push("DATABASE_URL fehlt oder ist keine postgres://-URL (z. B. Supabase Transaction Pooler mit ?pgbouncer=true&schema=unholy_reaper).");
}
if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 24) {
  problems.push("SECRET_KEY fehlt oder ist kürzer als 24 Zeichen.");
}
if (!process.env.SETUP_CODE) {
  problems.push("SETUP_CODE fehlt (Code für die Ersteinrichtung unter /setup).");
}
if (problems.length > 0) {
  console.error("\nVercel-Build abgebrochen, Umgebungsvariablen fehlen:\n- " + problems.join("\n- ") + "\nSiehe README, Abschnitt „Deployment auf Vercel“.\n");
  process.exit(1);
}
console.log("Umgebungsvariablen für das Deployment sind vollständig.");
