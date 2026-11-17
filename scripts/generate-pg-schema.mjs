// Erzeugt prisma/postgres/schema.prisma aus prisma/schema.prisma (SQLite).
// Die SQLite-Datei ist die einzige Quelle; die Postgres-Variante unterscheidet sich nur
// im Provider und im relativen Ausgabepfad des Clients.
//
//   node scripts/generate-pg-schema.mjs          schreibt die Datei
//   node scripts/generate-pg-schema.mjs --check  Fehler, wenn die Datei veraltet ist
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const source = readFileSync("prisma/schema.prisma", "utf8");
if (!/provider\s*=\s*"sqlite"/.test(source)) throw new Error('prisma/schema.prisma: provider = "sqlite" nicht gefunden');

const header =
  "// AUTOMATISCH ERZEUGT aus prisma/schema.prisma – nicht von Hand bearbeiten.\n" +
  "// Neu erzeugen mit: npm run db:pg-schema\n\n";
const target =
  header +
  source
    .replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"')
    .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"');

if (!target.includes('"../../src/generated/prisma"')) throw new Error("Ausgabepfad des Clients nicht gefunden");

const path = "prisma/postgres/schema.prisma";
if (process.argv.includes("--check")) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== target) {
    console.error(`${path} ist veraltet. Bitte "npm run db:pg-schema" ausführen und eine Postgres-Migration anlegen (siehe README).`);
    process.exit(1);
  }
  console.log(`${path} ist aktuell.`);
} else {
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync(path, target);
  console.log(`${path} geschrieben.`);
}
