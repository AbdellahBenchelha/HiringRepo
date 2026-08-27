/**
 * Which country a phone number belongs to.
 *
 * Used to stop the obvious dodge: selecting a country that requires nothing
 * while entering a number from one that does. A rule keyed only on the
 * dropdown is one click away from being useless.
 *
 * Pure data, no filesystem — the apply form and the Admin Panel both import it.
 *
 * This catches carelessness, not determination. Nothing here verifies that the
 * number is real or reachable; anyone who works out the rule can pick another
 * dial code and type any digits. The identity photographs remain the actual
 * check. This only closes the easy door.
 */
import { phoneCountries } from "@/config/phoneCountries";

// Longest dial code first, so +1242 (Bahamas) wins over +1 (North America).
const BY_LENGTH = [...phoneCountries].sort((a, b) => b.dial.length - a.dial.length);

/**
 * Every country whose dial code prefixes this number.
 *
 * Usually one. Two dial codes are shared — +1 by Canada and the United States,
 * +7 by Kazakhstan and Russia — and for those the answer is genuinely
 * ambiguous, so both are returned rather than guessing. A caller testing
 * membership of a required-country list therefore triggers if either matches:
 * asking an innocent Canadian for a document is recoverable, letting an
 * evasion through is not.
 *
 * Empty when the number is missing, has no international prefix, or carries a
 * dial code we do not recognise. Empty always means "no information", never
 * "no match" — a caller must not read it as evidence of anything.
 */
export function countriesForPhone(phone: string | undefined | null): string[] {
  // Applicants type "+234 803 123 4567", "+234-803-123-4567", "(+234) 803…".
  const compact = (phone ?? "").replace(/[\s\-().]/g, "");
  if (!compact.startsWith("+")) return [];

  const match = BY_LENGTH.find((c) => compact.startsWith(c.dial));
  if (!match) return [];

  return phoneCountries.filter((c) => c.dial === match.dial).map((c) => c.name);
}

/** Does this number belong to a country on the list? */
export function phoneCountryMatches(
  phone: string | undefined | null,
  list: readonly string[],
): boolean {
  return countriesForPhone(phone).some((name) => list.includes(name));
}

/**
 * The phone's countries when they contradict the stated one, for the Admin
 * Panel to show.
 *
 * Empty when they agree, when there is no number, or when no country has been
 * stated yet — an incomplete record is not a contradiction.
 */
export function phoneCountryMismatch(
  country: string | undefined | null,
  phone: string | undefined | null,
): string[] {
  if (!country) return [];
  const fromPhone = countriesForPhone(phone);
  if (fromPhone.length === 0) return [];
  return fromPhone.includes(country) ? [] : fromPhone;
}
