import { TIMEZONE } from "./format";

// Hilfsfunktionen, um Formularwerte (Ortszeit ohne Zeitzone) korrekt in
// UTC-Zeitpunkte umzurechnen und umgekehrt, unabhängig von der Server-Zeitzone.

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getZonedParts(date: Date, timeZone = TIMEZONE): Parts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Differenz der Zeitzone zu UTC in Minuten zu einem Zeitpunkt. */
function getOffsetMinutes(timestamp: number, timeZone = TIMEZONE) {
  const p = getZonedParts(new Date(timestamp), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - Math.floor(timestamp / 1000) * 1000) / 60000;
}

/** Wandelt eine Ortszeit (in TIMEZONE) in einen Date-Wert um. */
export function zonedTimeToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = getOffsetMinutes(guess);
  let result = guess - offset * 60000;
  const correctedOffset = getOffsetMinutes(result);
  if (correctedOffset !== offset) result = guess - correctedOffset * 60000;
  return new Date(result);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** true, wenn es den Tag wirklich gibt (kein 31.02.). */
function isRealDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Wert für <input type="datetime-local">, z. B. "2026-11-17T20:15". */
export function toDateTimeInputValue(date: Date) {
  const p = getZonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Wert für <input type="date">, z. B. "2026-11-17". */
export function toDateInputValue(date: Date) {
  const p = getZonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Tagesschlüssel in der App-Zeitzone, z. B. "2026-11-17". */
export function dayKey(date: Date) {
  return toDateInputValue(date);
}

/** Parst "YYYY-MM-DDTHH:mm" als Ortszeit. Gibt null bei ungültiger Eingabe zurück. */
export function parseDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number);
  if (!isRealDate(y, m, d) || h > 23 || min > 59) return null;
  return zonedTimeToDate(y, m, d, h, min);
}

/** Parst "YYYY-MM-DD" als Ortszeit 12:00 Uhr, damit das Datum stabil bleibt. */
export function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  if (!isRealDate(y, m, d)) return null;
  return zonedTimeToDate(y, m, d, 12, 0);
}

/** Beginn des Tages (00:00 Ortszeit), der `daysAgo` Tage vor heute liegt. */
export function startOfDayDaysAgo(daysAgo: number, now = new Date()) {
  const p = getZonedParts(now);
  const base = new Date(Date.UTC(p.year, p.month - 1, p.day - daysAgo));
  return zonedTimeToDate(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}
