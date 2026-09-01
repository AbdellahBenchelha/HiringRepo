/**
 * Where an application was actually sent from, judged by the server.
 *
 * The country field on the form is a dropdown nobody checks: someone
 * connecting from Morocco can select United States and the record says United
 * States. That matters most for US applicants, since those are the ones asked
 * for an SSN.
 *
 * `src/lib/geo.ts` already detects a country, but in the candidate's browser
 * and only to pre-fill the dropdown. As a check that is worthless — the
 * candidate can block or fake it from the dev console. The signal has to come
 * from the address the *server* observes, which is what this module reads.
 *
 * What it is not: proof. A VPN defeats it completely, so it catches
 * carelessness and honest mismatches, never determined fraud. Expats,
 * travellers, corporate VPNs and mobile carriers routing through a neighbouring
 * country all produce legitimate mismatches. It is a flag for a human to look
 * at and must never reject anyone by itself.
 *
 * Country only. An IP gives a country reliably; city is routinely wrong by
 * hundreds of kilometres and a street address is never available at all.
 */
import { countryNameFromIso2 } from "@/lib/geo";
import { clientIp } from "@/lib/rateLimit";

export interface DetectedOrigin {
  /** Lowercase ISO 3166-1 alpha-2. */
  iso2: string;
  /** The same country as a name from the app's list, or null if unmapped. */
  name: string | null;
}

/**
 * Reserved values Cloudflare sends instead of a country.
 *
 * XX — the address could not be resolved. T1 — the request arrived over Tor,
 * where the exit node's country says nothing about the person behind it.
 * Both mean "no information", which is not the same as a mismatch.
 */
const RESERVED = new Set(["xx", "t1"]);

/** A lookup must never hold up a submission, so it gets a short leash. */
const LOOKUP_TIMEOUT_MS = 2500;

function fromIso2(raw: string): DetectedOrigin | null {
  const iso2 = raw.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(iso2) || RESERVED.has(iso2)) return null;
  const name = countryNameFromIso2(iso2);
  // A code we cannot map to a country the form offers cannot be compared
  // against what the candidate selected, so it is not worth storing.
  return name ? { iso2, name } : null;
}

/** Addresses that no geolocation service can say anything useful about. */
function isRoutable(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  if (ip === "::1" || ip.startsWith("127.")) return false;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return false;
  // Unique local addresses (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd]/i.test(ip) || /^fe[89ab]/i.test(ip)) return false;
  return true;
}

async function lookupIp(ip: string): Promise<DetectedOrigin | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;
    if (record.success === false) return null;
    return typeof record.country_code === "string" ? fromIso2(record.country_code) : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort country for the caller behind `req`.
 *
 * Cloudflare's header first: free, instant, no third party, and present the
 * moment the domain sits behind Cloudflare's proxy — so if it ever does, this
 * silently upgrades with no code change. Otherwise an IP lookup.
 *
 * Returns null on any failure. Detection is bookkeeping and must never cost us
 * an application.
 */
export async function detectCountryFromRequest(req: Request): Promise<DetectedOrigin | null> {
  const header = req.headers.get("cf-ipcountry");
  if (header) {
    const fromHeader = fromIso2(header);
    // A reserved or unmappable value still means Cloudflare answered, and the
    // lookup below would only ask about the same address. Stop here.
    return fromHeader;
  }

  const ip = clientIp(req);
  if (!isRoutable(ip)) return null;
  return lookupIp(ip);
}
