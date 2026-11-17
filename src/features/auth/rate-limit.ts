import "server-only";

// Einfache Sperre gegen Passwort-Raten: nach 8 Fehlversuchen in 10 Minuten
// ist der Login für diesen Benutzernamen 10 Minuten gesperrt.
// Liegt nur im Arbeitsspeicher und gilt daher pro Server-Prozess.

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

type Entry = { count: number; firstAttempt: number; blockedUntil?: number };

const globalStore = globalThis as unknown as { loginAttempts?: Map<string, Entry> };
const attempts = (globalStore.loginAttempts ??= new Map<string, Entry>());

export function loginBlockedFor(key: string): number {
  const entry = attempts.get(key);
  if (!entry?.blockedUntil) return 0;
  const remaining = entry.blockedUntil - Date.now();
  if (remaining <= 0) {
    attempts.delete(key);
    return 0;
  }
  return remaining;
}

/** Entfernt Einträge, deren Zeitfenster und Sperre abgelaufen sind. */
function prune(now: number) {
  for (const [key, entry] of attempts) {
    if (now - entry.firstAttempt > WINDOW_MS && (!entry.blockedUntil || entry.blockedUntil < now)) attempts.delete(key);
  }
}

export function registerFailedLogin(key: string) {
  const now = Date.now();
  prune(now);
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.blockedUntil = now + WINDOW_MS;
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
