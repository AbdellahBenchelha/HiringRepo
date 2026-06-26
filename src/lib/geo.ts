/**
 * Best-effort country detection from the visitor's IP address.
 *
 * Used to pre-fill the application form's Country field on load. The visitor
 * can always change it afterwards. Detection never throws and returns null on
 * any failure, so the form keeps working if the lookup is blocked or offline.
 */
import { countries } from "@/config/countries";
import { phoneCountries } from "@/config/phoneCountries";

// ISO 3166-1 alpha-2 (lowercase) -> the country name used across the app.
const ISO2_TO_NAME = new Map(phoneCountries.map((c) => [c.iso2.toLowerCase(), c.name]));
const COUNTRY_NAMES = new Set(countries);

/**
 * Resolve the visitor's country to a name that exists in the app's country
 * list, or null if it can't be determined / matched.
 */
export async function detectCountryName(): Promise<string | null> {
  try {
    // ipwho.is is free, needs no API key, supports HTTPS + CORS, and detects
    // the caller's public IP automatically (so it also works on localhost).
    const res = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;

    // Prefer matching by ISO code, then fall back to the returned name.
    const iso2 = typeof record.country_code === "string" ? record.country_code.toLowerCase() : "";
    const byIso = ISO2_TO_NAME.get(iso2);
    if (byIso && COUNTRY_NAMES.has(byIso)) return byIso;

    const name = typeof record.country === "string" ? record.country : "";
    if (name && COUNTRY_NAMES.has(name)) return name;

    return null;
  } catch {
    return null;
  }
}
