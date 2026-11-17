import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Verschlüsselung für Schließfach-Codes und -Passwörter (AES-256-GCM).
// Der Schlüssel wird aus SECRET_KEY abgeleitet. Ändert sich SECRET_KEY,
// können vorhandene Werte nicht mehr entschlüsselt werden.

const DEV_FALLBACK_SECRET = "unholy-reaper-dev-only-secret";
const PLACEHOLDER = "bitte-aendern-langer-zufaelliger-wert";

function getKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret || secret === PLACEHOLDER) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECRET_KEY ist nicht gesetzt. Bitte in der .env einen langen Zufallswert eintragen (siehe README).",
      );
    }
    return createHash("sha256").update(DEV_FALLBACK_SECRET).digest();
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

/** Gibt null zurück, wenn der Wert fehlt oder nicht entschlüsselt werden kann. */
export function decryptSecret(value: string | null | undefined) {
  if (!value) return null;
  try {
    const [version, iv, tag, data] = value.split(":");
    if (version !== "v1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
