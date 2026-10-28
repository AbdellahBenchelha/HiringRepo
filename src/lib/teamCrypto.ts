/**
 * SERVER-ONLY. Encryption for members' bank account numbers.
 *
 * An IBAN is the one thing in the team data that moves money, so it is never
 * written to disk in clear: AES-256-GCM, with a fresh random nonce for every
 * value, under a key that lives only in the host's environment.
 *
 *   TEAM_BANK_KEY — 32 random bytes, as 64 hex characters. Generate one with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Keep a copy of the key somewhere safe. Without it, saved IBANs cannot be
 * read back — by anyone — and members have to enter them again.
 *
 * Production without the key refuses to store bank details at all, rather
 * than falling back to a key that is committed to this repository.
 */
import crypto from "node:crypto";

const DEV_KEY = crypto.createHash("sha256").update("workroute-team-bank-dev-key").digest();

function key(): Buffer | null {
  const raw = process.env.TEAM_BANK_KEY?.trim();
  if (raw) {
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
    return null;
  }
  return process.env.NODE_ENV === "production" ? null : DEV_KEY;
}

/** Whether bank details can be saved and read on this server. */
export function bankCryptoReady(): boolean {
  return key() !== null;
}

export function encryptSecret(plain: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string | null {
  const k = key();
  if (!k) return null;
  const [v, iv, tag, data] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
