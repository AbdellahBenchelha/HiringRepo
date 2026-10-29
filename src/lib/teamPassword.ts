/**
 * SERVER-ONLY. Passwords for the team portal.
 *
 * A member signs in with their professional @workroute.team address and a
 * password. The password is stored the same way as a bank IBAN — encrypted
 * with AES-256-GCM under TEAM_BANK_KEY (see teamCrypto) — so a recruiter can
 * read it back to a member who has forgotten it, while it is never written to
 * disk in clear. Without the key, production will not store or check
 * passwords at all.
 *
 * A new member is given a random temporary password, emailed to their
 * personal address. It works for a few days and must be changed at the first
 * sign-in. After that the member sets their own; they can change it again in
 * Profile, or ask a recruiter, who can read the current one and send it.
 */
import crypto from "node:crypto";
import { decryptSecret, encryptSecret } from "@/lib/teamCrypto";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;
export const TEMP_PASSWORD_DAYS = 7;
export const PASSWORD_MAX_TRIES = 5;
export const PASSWORD_LOCK_MS = 15 * 60 * 1000;

// No 0/O/1/I/l: a temporary password is read off a screen and typed by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** A readable one-time password, e.g. "Kp7q-M4xR-a9zT". */
export function generateTempPassword(): string {
  const pick = () => ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  const group = () => Array.from({ length: 4 }, pick).join("");
  return `${group()}-${group()}-${group()}`;
}

/** The encrypted form to store, or null if the key is missing. */
export function encryptPassword(plain: string): string | null {
  return encryptSecret(plain);
}

/** The password in clear, for a recruiter to read or for checking a sign-in. */
export function decryptPassword(stored: string | undefined): string | null {
  return stored ? decryptSecret(stored) : null;
}

function constantEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  // Compare a fixed-length digest so the check does not leak the length.
  const ha = crypto.createHash("sha256").update(ab).digest();
  const hb = crypto.createHash("sha256").update(bb).digest();
  return crypto.timingSafeEqual(ha, hb) && ab.length === bb.length;
}

/** Does `candidate` match the member's stored password? */
export function passwordMatches(stored: string | undefined, candidate: string): boolean {
  const plain = decryptPassword(stored);
  if (plain === null) return false;
  return constantEquals(plain, candidate);
}

// A few of the most-guessed passwords. The length rule stops most weak ones;
// this just blocks the obvious strings that still reach ten characters.
const BANNED = new Set([
  "password12",
  "password123",
  "1234567890",
  "qwertyuiop",
  "workroute1",
  "workroute12",
  "letmein123",
  "iloveyou12",
]);

/**
 * What is wrong with a chosen password, or null if it is fine. `tempOrCurrent`
 * is the password being replaced; the new one must differ from it.
 */
export function passwordProblem(password: string, tempOrCurrent?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return "That password is too long.";
  if (/^\s|\s$/.test(password)) return "The password cannot start or end with a space.";
  if (tempOrCurrent && password === tempOrCurrent) return "Choose a password different from the current one.";
  if (BANNED.has(password.toLowerCase())) return "That password is too easy to guess. Choose another.";
  return null;
}
