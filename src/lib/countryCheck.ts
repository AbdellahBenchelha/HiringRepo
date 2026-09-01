/**
 * Does the country a candidate selected match the one they applied from?
 *
 * Derived, never stored — like `followUpState` in `src/lib/followUp.ts`. A
 * stored boolean would be wrong the moment either value changed, and the
 * stated country is editable.
 *
 * Pure module: no filesystem, no node built-ins, so the table, the export and
 * any API route can share one definition.
 */

export type CountryMatch = "match" | "mismatch" | "unknown";

export interface CountryCheckInput {
  country?: string;
  detectedCountryName?: string;
}

/**
 * `unknown` covers both "detection failed" and "no country stated yet". Both
 * are an absence of information, and neither is a problem — treating a missing
 * value as a mismatch would flag every candidate who reached step one behind a
 * VPN or stopped before the country field.
 */
export function countryMatch(c: CountryCheckInput): CountryMatch {
  const stated = (c.country ?? "").trim();
  const detected = (c.detectedCountryName ?? "").trim();
  if (!stated || !detected) return "unknown";
  return stated === detected ? "match" : "mismatch";
}

export function isCountryMismatch(c: CountryCheckInput): boolean {
  return countryMatch(c) === "mismatch";
}
