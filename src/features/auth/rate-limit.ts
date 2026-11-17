import "server-only";

// Einfache Sperre gegen Passwort-Raten: nach 5 Fehlversuchen in 10 Minuten
// ist der Login für diese Kombination aus Benutzername und IP 10 Minuten gesperrt.
// Liegt nur im Arbeitsspeicher und gilt daher pro Server-Prozess.

const MAX_ATTEMPTS = 5;
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

export function registerFailedLogin(key: string) {
  const now = Date.now();
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
