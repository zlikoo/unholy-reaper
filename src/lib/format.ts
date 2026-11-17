// Formatierung für Anzeige. Zeitzone ist über APP_TIMEZONE einstellbar.

export const TIMEZONE = process.env.APP_TIMEZONE || "Europe/Berlin";

const moneyFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("de-DE");

export function formatMoney(amount: number) {
  return moneyFormatter.format(amount);
}

/** "+ 1.200 $" bzw. "− 300 $" */
export function formatSignedMoney(amount: number) {
  const sign = amount < 0 ? "−" : "+";
  return `${sign} ${moneyFormatter.format(Math.abs(amount))}`;
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

/** Relative Angabe wie "vor 5 Minuten" für jüngere Zeitpunkte, sonst Datum. */
export function formatRelative(date: Date, now = new Date()) {
  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
  if (abs < 60) return "gerade eben";
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diffSeconds / 86400), "day");
  return formatDateTime(date);
}

/** "heute", "gestern" oder "vor 12 Tagen" (Kalendertage in der App-Zeitzone). */
export function formatDaysAgo(date: Date, now = new Date()) {
  const day = (d: Date) => {
    const [y, m, dd] = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d).split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  const days = Math.round((day(now) - day(date)) / 86_400_000);
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  if (days === -1) return "morgen";
  return days > 0 ? `vor ${days} Tagen` : `in ${-days} Tagen`;
}
