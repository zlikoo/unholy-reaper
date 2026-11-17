# Unholy Reaper MC · Verwaltungstool

Internes Verwaltungstool für den Motorradclub „Unholy Reaper MC“ auf einem GTA-Roleplay-Server. Alle Daten (Mitglieder, Fahrzeuge, Geld, Waffen) sind fiktive In-Game-Daten.

Funktionen:

- Login mit Benutzername und Passwort (bcrypt-Hash), Sitzungen in der Datenbank, Sperre nach 5 Fehlversuchen
- Rechte nach Rang: President, Vice President, Sergeant at Arms, Secretary/Treasurer, Road Captain, IT, Fullpatch, Prospect, Hangaround
- Dashboard mit Kontostand, Fahrzeugen, Waffenbestand, Mitgliedern, Terminen und letzten Aktivitäten
- Schwarzes Brett mit Kategorien, Terminen, Anpinnen und Sichtbarkeit nach Rang
- Fahrzeuge mit Suche, Filtern, Karten- und Tabellenansicht, Ein-/Auslagern mit einem Klick
- Kasse mit Kontostand, 30-Tage-Diagramm, Verlauf und Freigabe großer Auszahlungen
- Waffenlager mit Aus- und Rückgabe (auch Teilmengen), „Wer hat was“ und Bestandsübersicht
- Schließfächer mit Zahlenschloss-Code und Passwort (verschlüsselt), sichtbar nur für freigegebene Ränge
- Mitgliederverwaltung mit Rang, Sponsor, Beitrittsdatum, Notizen, Aktiv/Inaktiv
- Clubregeln, Hierarchie, Regeln für Hangarounds und Prospects (in der App pflegbar)
- Aktivitätslog für jede Änderung, mit Benutzer, Zeit und Vorher/Nachher

## Voraussetzungen

- Node.js 20.19, 22.12 oder neuer (empfohlen: aktuelle LTS-Version)
- npm

## Einrichtung

```bash
npm install
```

`npm install` erzeugt dabei automatisch den Prisma-Client.

Konfiguration anlegen (unter Windows `copy` statt `cp`):

```bash
cp .env.example .env
```

In der `.env` einen eigenen `SECRET_KEY` eintragen. Damit werden die Codes und Passwörter der Schließfächer verschlüsselt. Einen Zufallswert erzeugt dieser Befehl:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Datenbank anlegen:

```bash
npm run db:deploy
```

Danach entweder Beispieldaten laden (zum Ausprobieren) oder direkt den ersten Admin-Account anlegen (siehe unten):

```bash
npm run db:seed
```

App starten:

```bash
npm run dev
```

Die App läuft dann unter http://localhost:3000.

## Ersten Admin-Account anlegen

Der erste Account bekommt den Rang President und kann danach alle weiteren Mitglieder in der App unter „Mitglieder → Mitglied aufnehmen“ anlegen. Ist die Datenbank noch leer, legt das Skript außerdem die Clubregeln, die Hierarchie und die Regeln für Hangarounds und Prospects mit euren Startinhalten an (Quelle: `src/features/rules/default-rules.ts`).

Interaktiv (fragt Benutzername, Name und Passwort ab):

```bash
npm run admin:create
```

Oder mit Parametern:

```bash
npm run admin:create -- --username grim --name "Elias Voss" --password "mindestens8zeichen"
```

Regeln: Benutzername 3–30 Zeichen (Kleinbuchstaben, Ziffern, `.`, `_`, `-`), Passwort mindestens 8 Zeichen.

Notfallzugang: Kann sich kein President mehr einloggen, setzt `--reset` ein vorhandenes Konto zurück (neues Passwort, Rang President, aktiv) und meldet es überall ab:

```bash
npm run admin:create -- --username grim --password "neuesPasswort123" --reset
```

Jedes Mitglied ändert sein Passwort selbst unter „Profil“ (unten in der Seitenleiste).

## Demo-Zugänge

Nach `npm run db:seed` gibt es diese Konten, alle mit dem Passwort `reaper123`:

| Benutzername | Rang |
|---|---|
| grim | President |
| hatchet | Vice President |
| bones | Sergeant at Arms |
| ledger | Secretary / Treasurer |
| wheels | Road Captain |
| byte | IT |
| spoke, rust | Fullpatch |
| smoke | Fullpatch (inaktiv, Login gesperrt) |
| rookie | Prospect |
| dust | Hangaround |

Der Seed bricht ab, wenn schon Mitglieder existieren. `npm run db:seed -- --force` löscht vorher **alle** Daten.

Für den echten Einsatz mit einer leeren Datenbank starten: Dev-Server stoppen, `prisma/dev.db` löschen, `npm run db:deploy` ausführen und mit `npm run admin:create` den eigenen Admin anlegen.

## Rechte

Lesen dürfen alle ab Prospect. Hangarounds sind keine Mitglieder und sehen nur Dashboard, Schwarzes Brett (Aushänge „für alle“) und die Clubregeln.

| Bereich | Hangaround | Prospect | Fullpatch | IT | Road Captain | Secretary/Treasurer | Sergeant at Arms | Vice | President |
|---|---|---|---|---|---|---|---|---|---|
| Fahrzeuge anlegen, bearbeiten, ein-/auslagern | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fahrzeuge löschen | – | – | – | – | ✓ | – | ✓ | ✓ | ✓ |
| Waffen einlagern, ausgeben, zurücknehmen | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Waffen-Posten löschen | – | – | – | – | – | – | ✓ | ✓ | ✓ |
| Schließfächer anlegen und Zugriff festlegen | – | – | – | – | – | – | ✓ | ✓ | ✓ |
| Kasse buchen und Buchungen löschen | – | – | – | – | – | ✓ | – | ✓ | ✓ |
| Große Auszahlungen freigeben, Freigabegrenze ändern | – | – | – | – | – | ✓ | – | – | ✓ |
| Konten anlegen, Passwörter zurücksetzen, (de)aktivieren | – | – | – | ✓¹ | – | – | – | ✓ | ✓ |
| Ränge vergeben und ändern | – | – | – | – | – | – | – | ✓ | ✓ |
| Aushänge veröffentlichen (eigene bearbeiten) | – | – | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Alle Aushänge bearbeiten, anpinnen | – | – | – | – | ✓ | – | ✓ | ✓ | ✓ |
| Aushänge „nur Officers“ sehen | – | – | – | – | ✓ | ✓ | ✓ | ✓ | ✓ |
| Clubregeln pflegen | – | – | – | – | – | ✓ | – | ✓ | ✓ |
| Aktivitätslog einsehen | – | – | – | ✓ | – | – | ✓ | ✓ | ✓ |

¹ IT legt Konten nur bis Rang Fullpatch an und bearbeitet keine Officer-Konten (President, Vice, Sergeant at Arms, Secretary/Treasurer, Road Captain). So kann niemand über IT an einen Officer-Account kommen. Ränge ändert IT nicht.

Zusätzliche Regeln bei Mitgliedern: Nur der President vergibt den Rang President und bearbeitet President-Konten. Niemand kann den eigenen Rang ändern oder sich selbst deaktivieren. Deaktivierte Mitglieder werden sofort abgemeldet.

Alle Rechte stehen an einer Stelle: `src/features/auth/permissions.ts`. Jede Seite und jede Server Action prüft sie serverseitig, die Buttons in der Oberfläche werden nur zusätzlich ausgeblendet.

## Kasse und Freigaben

Der Kontostand ergibt sich aus allen gebuchten Ein- und Auszahlungen. Auszahlungen über der Freigabegrenze (Standard 10.000 $, einstellbar auf der Kassenseite) landen als „wartet auf Freigabe“ und zählen erst nach der Freigabe. Freigeben dürfen Secretary/Treasurer und President, aber nicht bei der eigenen Auszahlung (Vier-Augen-Prinzip). Auszahlungen, die nicht durch den Kontostand gedeckt sind, werden abgelehnt.

## Schließfächer und Waffenlager

Jedes Schließfach hat Nummer, Standort, Zahlenschloss-Code, Passwort und eine Liste der Ränge, die es sehen dürfen. Der President sieht immer alle Fächer. Code und Passwort liegen AES-256-GCM-verschlüsselt in der Datenbank und werden erst auf Klick angezeigt; jeder Abruf steht im Log.

Wichtig: Wird `SECRET_KEY` geändert, lassen sich vorhandene Codes nicht mehr entschlüsseln und müssen neu eingetragen werden.

Waffen im Lager liegen in einem Schließfach. Wer ein Fach nicht sehen darf, sieht auch dessen Inhalt nicht. Ausgegebene Waffen sind bei der Person und für alle Mitglieder sichtbar. Wird nur ein Teil eines Postens ausgegeben (z. B. 5 von 30 Schachteln Munition), teilt die App den Posten auf; bei der Rückgabe wird er wieder mit dem gleichen Posten im Fach zusammengeführt. Die Historie bleibt dabei vollständig erhalten.

## Logo austauschen

Das Logo liegt unter `public/logo.png` und wird für Seitenleiste, Login und Browser-Tab verwendet. Zum Austauschen einfach die Datei durch das eigene Logo ersetzen (quadratisch, am besten 512 × 512 Pixel, PNG mit transparentem Hintergrund).

## Texte formatieren

Schwarzes Brett und Clubregeln verstehen eine einfache Formatierung: Zeilen mit `- ` werden zur Aufzählung, Zeilen mit `1. ` zur nummerierten Liste, `**Text**` wird fett, eine Leerzeile beginnt einen neuen Absatz.

## Produktivbetrieb

```bash
npm run build
npm start
```

Die App läuft dann auf Port 3000 (anderer Port: `PORT=8080 npm start`).

Das Session-Cookie wird im Produktivbetrieb nur über HTTPS gesendet. Läuft die App ohne HTTPS (z. B. `http://IP:3000`), in der `.env` `SESSION_COOKIE_SECURE="false"` setzen, sonst klappt der Login nicht. Besser ist ein Reverse Proxy mit HTTPS (z. B. Caddy oder nginx).

Datensicherung: Die komplette Datenbank ist die Datei `prisma/dev.db`. Regelmäßig kopieren, dazu die `.env` (wegen `SECRET_KEY`).

Nach einem Update mit neuen Migrationen: `npm install` und `npm run db:deploy`.

## Deployment auf Vercel (Postgres)

Auf Vercel gibt es kein dauerhaftes Dateisystem, deshalb läuft die App dort mit Postgres. Lokal bleibt SQLite. Welche Datenbank genutzt wird, entscheidet allein die URL in `DATABASE_URL`: `file:…` ist SQLite, `postgres://…` oder `postgresql://…` ist Postgres.

Für Postgres gibt es eine erzeugte Schema-Variante mit eigenen Migrationen in `prisma/postgres/`. Die Quelle bleibt `prisma/schema.prisma`.

Umgebungsvariablen im Vercel-Projekt:

| Variable | Inhalt |
|---|---|
| `DATABASE_URL` | Postgres-Verbindung für die App. Bei Supabase der **Transaction Pooler** (Port 6543) mit `?pgbouncer=true&schema=unholy_reaper` |
| `DIRECT_DATABASE_URL` (oder `DIRECT_URL`) | Verbindung für Migrationen. Bei Supabase der **Session Pooler** (Port 5432) mit `?schema=unholy_reaper` |
| `SECRET_KEY` | Langer Zufallswert für die Schließfach-Verschlüsselung |
| `SETUP_CODE` | Code für die Ersteinrichtung unter `/setup` |

Mit `?schema=unholy_reaper` legt die App alle Tabellen in ein eigenes Schema. So kann sie ein bestehendes Supabase-Projekt mitbenutzen (der kostenlose Tarif erlaubt nur zwei Projekte), ohne mit dessen Tabellen zu kollidieren. Die Verbindungsdaten stehen in Supabase unter „Connect → ORMs → Prisma“ (`DATABASE_URL` und `DIRECT_URL`, beide Namen werden erkannt).

Neon (über Vercel → Storage) funktioniert ebenso: Die Integration setzt `DATABASE_URL` und `DATABASE_URL_UNPOOLED`, beide werden automatisch erkannt.

Die Funktionen laufen in Dublin (`dub1` in `vercel.json`), nah an der Supabase-Datenbank in `eu-west-1`. Liegt die Datenbank woanders, die Region dort anpassen. Der Build-Befehl `npm run vercel-build` steht ebenfalls in `vercel.json` und wird beim Import automatisch übernommen. Er prüft zuerst, ob `DATABASE_URL`, `SECRET_KEY` und `SETUP_CODE` gesetzt sind, dann das Postgres-Schema, erzeugt den Client, wendet die Migrationen an und baut die App.

Erster Login: Beim ersten Aufruf leitet die App auf `/setup` um. Dort mit dem `SETUP_CODE` den ersten President anlegen; dabei werden auch die Clubregeln angelegt. Danach ist `/setup` gesperrt.

Bei einer Schemaänderung: `prisma/schema.prisma` anpassen, lokal `npm run db:migrate` (SQLite), dann `npm run db:pg-schema` und eine Postgres-Migration erzeugen, zum Beispiel gegen eine lokale Postgres-Instanz aus `npx prisma dev`:

```bash
DATABASE_URL="postgres://…" npx prisma migrate dev --name beschreibung
```

Der Vercel-Build bricht ab, wenn `prisma/postgres/schema.prisma` nicht zum SQLite-Schema passt.

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` / `npm start` | Produktiv-Build bauen und starten |
| `npm run lint` / `npm run typecheck` | ESLint und TypeScript prüfen |
| `npm run db:deploy` | Migrationen anwenden (legt die Datenbank an) |
| `npm run db:migrate` | Neue Migration nach Schemaänderung erzeugen |
| `npm run db:seed` | Beispieldaten laden (`-- --force` überschreibt alles) |
| `npm run db:reset` | Datenbank leeren und Beispieldaten neu laden |
| `npm run db:studio` | Prisma Studio (Datenbank im Browser ansehen) |
| `npm run admin:create` | Ersten Admin anlegen oder Konto zurücksetzen |
| `npm run db:pg-schema` | Postgres-Schema aus dem SQLite-Schema erzeugen |
| `npm run vercel-build` | Build für Vercel (Postgres-Migrationen + Build) |

## Ordnerstruktur

```
prisma/
  schema.prisma        Datenmodell (Quelle, SQLite)
  migrations/          SQLite-Migrationen
  postgres/            Erzeugtes Postgres-Schema und Postgres-Migrationen
  seed.ts              Beispieldaten
scripts/
  create-admin.ts      Ersten Admin anlegen
  generate-pg-schema.mjs  Postgres-Schema erzeugen
public/logo.png        Club-Logo (austauschbar)
src/
  app/                 Seiten (App Router), nur Routing und Seitenaufbau
    login/
    (app)/             Alle Seiten hinter dem Login, mit Seitenleiste
  components/
    layout/            Seitenleiste, Logo
    ui/                Buttons, Karten, Formulare, Tabellen, Badges …
  features/            Fachlogik je Bereich
    auth/              Login, Sitzungen, Passwörter, Rechte
    activity/          Aktivitätslog
    board/             Schwarzes Brett
    lockers/           Schließfächer und Sichtbarkeitsregeln
    members/           Mitglieder
    rules/             Clubregeln
    treasury/          Kasse, Diagramm, Freigaben
    vehicles/          Fahrzeuge
    weapons/           Waffenlager (Aufteilen/Zusammenführen)
  lib/                 Datenbank-Client, Validierung, Datum, Formatierung, Verschlüsselung
  proxy.ts             Leitet ohne Session-Cookie auf /login um
```

Jeder Bereich unter `src/features` hat `actions.ts` (Server Actions mit Rechteprüfung, zod-Validierung und Log-Eintrag), bei Bedarf `schemas.ts`, `queries.ts` und `components/`.

## Technische Hinweise

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, Prisma 7 (Adapter `better-sqlite3` lokal, `pg` für Postgres), zod 4.
- `cacheComponents` ist bewusst abgeschaltet: Jede Seite hängt vom eingeloggten Mitglied ab und wird pro Anfrage gerendert.
- Alle Eingaben werden serverseitig mit zod geprüft; Fehlermeldungen erscheinen direkt am Feld, die Eingaben bleiben erhalten.
- Datumsangaben werden in der Zeitzone aus `APP_TIMEZONE` (Standard `Europe/Berlin`) angezeigt und eingegeben.
- Schriften (Rye, Oswald, Inter) sind über npm eingebunden und werden selbst ausgeliefert, es gibt keine Anfragen an Google Fonts.
