import bcrypt from "bcryptjs";

const COST = 12;

export const PASSWORD_MIN_LENGTH = 8;

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Vergleichs-Hash für unbekannte Benutzernamen, damit die Antwortzeit gleich bleibt
// und man nicht erraten kann, welche Benutzernamen existieren.
let dummyHash: Promise<string> | undefined;

export async function verifyPasswordOrDummy(password: string, hash: string | undefined) {
  if (!hash) {
    dummyHash ??= bcrypt.hash("unholy-reaper-dummy", COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
