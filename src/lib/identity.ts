/**
 * Normalising applicant identifiers so duplicates actually match.
 *
 * Client-safe: no node built-ins, so the form can use the same rules the
 * server does.
 */

/**
 * Reduce a phone number to a comparable key.
 *
 * The same person writes their number many ways — "+212 612345678",
 * "0612345678", "06 12 34 56 78", "+212-612-345-678". Comparing the raw
 * strings finds none of them, which would leave the duplicate check silently
 * doing nothing.
 *
 * Everything but digits is dropped, then the last 9 digits are kept. That
 * discards the country code and any national trunk prefix (the leading 0 in
 * most of Europe and North Africa), which are exactly the parts that vary
 * between how a number is typed and how it is dialled.
 *
 * Returns "" for anything too short to compare, so callers can skip it rather
 * than match every short string against every other.
 */
export function normalisePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  return digits.slice(-9);
}

/** Lowercased, trimmed email for comparison. Returns "" if unusable. */
export function normaliseEmail(raw: string): string {
  const value = (raw || "").trim().toLowerCase();
  return value.includes("@") ? value : "";
}
