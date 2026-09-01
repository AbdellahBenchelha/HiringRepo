/**
 * Best-effort country detection from the visitor's IP address.
 *
 * Used to pre-fill the application form's Country field and the phone field's
 * dialling code on load. The visitor can always change either afterwards.
 * Detection never throws and returns null on any failure, so the form keeps
 * working if the lookup is blocked or offline.
 */
import { countries } from "@/config/countries";
import { phoneCountries } from "@/config/phoneCountries";

// ISO 3166-1 alpha-2 (lowercase) -> the country name used across the app.
const ISO2_TO_NAME = new Map(phoneCountries.map((c) => [c.iso2.toLowerCase(), c.name]));
const KNOWN_ISO2 = new Set(phoneCountries.map((c) => c.iso2.toLowerCase()));
const COUNTRY_NAMES = new Set(countries);

/**
 * Map an ISO 3166-1 alpha-2 code to the country name used across the app.
 *
 * Returns null for a code we do not carry, or one whose name is not in the
 * form's own list — a name that cannot be selected in the form is useless for
 * comparing against what the candidate selected.
 *
 * Exported so the server-side detection reuses this table rather than building
 * a second one that would drift from it.
 */
export function countryNameFromIso2(iso2: string): string | null {
  const key = iso2.trim().toLowerCase();
  if (!KNOWN_ISO2.has(key)) return null;
  const name = ISO2_TO_NAME.get(key);
  return name && COUNTRY_NAMES.has(name) ? name : null;
}

export interface DetectedCountry {
  /** Lowercase ISO 3166-1 alpha-2 code, guaranteed to exist in phoneCountries. */
  iso2: string;
  /** Matching name from the app's country list, or null if it isn't in the list. */
  name: string | null;
}

// The lookup is shared: the form asks for the country and the dialling code,
// and both should come from a single request.
let inFlight: Promise<DetectedCountry | null> | null = null;

async function lookup(): Promise<DetectedCountry | null> {
  try {
    // ipwho.is is free, needs no API key, supports HTTPS + CORS, and detects
    // the caller's public IP automatically (so it also works on localhost).
    const res = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;

    const iso2 = typeof record.country_code === "string" ? record.country_code.toLowerCase() : "";
    if (iso2 && KNOWN_ISO2.has(iso2)) {
      return { iso2, name: countryNameFromIso2(iso2) };
    }

    // No usable ISO code — fall back to matching the returned country name.
    const name = typeof record.country === "string" ? record.country : "";
    if (name && COUNTRY_NAMES.has(name)) {
      const match = phoneCountries.find((c) => c.name === name);
      if (match) return { iso2: match.iso2.toLowerCase(), name };
    }

    return null;
  } catch {
    return null;
  }
}

/** Resolve the visitor's country as both an ISO code and an app country name. */
export function detectCountry(): Promise<DetectedCountry | null> {
  if (!inFlight) inFlight = lookup();
  return inFlight;
}

/**
 * Resolve the visitor's country to a name that exists in the app's country
 * list, or null if it can't be determined / matched.
 */
export async function detectCountryName(): Promise<string | null> {
  return (await detectCountry())?.name ?? null;
}
