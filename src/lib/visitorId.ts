/**
 * SERVER-ONLY. Telling one visitor from another without following anyone.
 *
 * Counting unique visitors normally means a cookie: a random id in the
 * browser, kept for a year, which is a tracking identifier and needs consent
 * to set. Consent means only the visitors who accept are counted, and the
 * figure quietly becomes "some fraction of our traffic" with nobody able to
 * say which fraction.
 *
 * So there is no cookie and nothing stored in the browser. A visitor's id for
 * the day is an HMAC of their address and browser under a secret that is
 * thrown away and replaced at midnight. Three consequences, all deliberate:
 *
 *   - the address is never written down — the digest cannot be reversed, and
 *     without the day's salt it cannot even be brute-forced from a list of
 *     candidate addresses afterwards;
 *   - the same person is a different id tomorrow, so nobody can be followed
 *     from one day to the next;
 *   - and therefore a week's "visitors" is a sum of seven daily counts, not a
 *     count of seven days' distinct people. Everything downstream says so.
 *
 * This is the approach Plausible and Fathom use, for the same reason.
 */
import { createHmac, randomBytes } from "node:crypto";

/** A fresh secret for a new day. Never persisted beyond the day it belongs to. */
export function newSalt(): string {
  return randomBytes(32).toString("hex");
}

/**
 * The visitor's id for today.
 *
 * Address and browser together, because an address alone merges everyone
 * behind one office router or mobile carrier NAT into a single "visitor".
 * Truncated to 128 bits, which is far beyond enough to avoid collisions
 * within one day and keeps the stored set small.
 */
export function visitorId(salt: string, ip: string, userAgent: string): string {
  return createHmac("sha256", salt)
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}
