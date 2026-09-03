/**
 * SERVER-ONLY client for the Companies House Public Data API.
 *
 * Configure in the host's environment:
 *   COMPANIES_HOUSE_API_KEY — a REST key from developer.company-information.
 *                             service.gov.uk. Create it unrestricted: a key
 *                             limited to a JavaScript domain is meant for
 *                             browser use and answers 403 to a server.
 *
 * Authentication is HTTP Basic with the key as the username and no password,
 * which is unusual enough to be worth stating: there is no bearer token and no
 * secret beside the key.
 *
 * If the key is missing every call reports "not_configured" rather than
 * throwing, so the feature is simply unavailable instead of breaking the page
 * it lives on.
 */
import { dobMatches, type CompanyAppointment, type CompanyOfficerMatch } from "@/lib/companyCheck";

/**
 * COMPANIES_HOUSE_API_BASE exists so a test can point this at a local stub and
 * assert on what would have been requested, the same way the mail and Telegram
 * clients do. Unset everywhere else, which is the real API.
 */
function base(): string {
  const override = process.env.COMPANIES_HOUSE_API_BASE?.trim();
  return (override || "https://api.company-information.service.gov.uk").replace(/\/$/, "");
}

/** A slow register must never hold a request open indefinitely. */
const TIMEOUT_MS = 8000;

/**
 * How many same-name officers to pull appointments for.
 *
 * A common name can return hundreds. Each one we follow is another request, so
 * this is capped — and if the date of birth has already narrowed it, there is
 * rarely more than one anyway.
 */
const MAX_FOLLOWED = 5;

export type LookupFailure = "not_configured" | "unauthorised" | "rate_limited" | "unavailable";

async function get(path: string): Promise<
  { ok: true; data: unknown } | { ok: false; reason: LookupFailure }
> {
  const key = process.env.COMPANIES_HOUSE_API_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key) return { ok: false, reason: "not_configured" };

  try {
    const res = await fetch(`${base()}${path}`, {
      // The key is the username and the password is empty — hence the bare
      // colon. Node has no built-in helper for this, so it is built by hand.
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorised" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    // A 404 on a search is not an error; on an officer it means gone. Either
    // way there is nothing to report but emptiness.
    if (res.status === 404) return { ok: true, data: null };
    if (!res.ok) return { ok: false, reason: "unavailable" };

    return { ok: true, data: (await res.json()) as unknown };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function rec(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/** The officer id lives inside the self link, "/officers/{id}/appointments". */
function officerIdFrom(links: unknown): string {
  const self = str(rec(links).self);
  return /\/officers\/([^/]+)/.exec(self)?.[1] ?? "";
}

function dobFrom(v: unknown): { month: number; year: number } | undefined {
  const d = rec(v);
  const month = num(d.month);
  const year = num(d.year);
  return month && year ? { month, year } : undefined;
}

export interface OfficerHit {
  officerName: string;
  officerId: string;
  dob?: { month: number; year: number };
}

/** Search the register of officers by name. */
export async function searchOfficers(
  name: string,
): Promise<{ ok: true; total: number; hits: OfficerHit[] } | { ok: false; reason: LookupFailure }> {
  const query = name.trim();
  if (!query) return { ok: true, total: 0, hits: [] };

  const res = await get(`/search/officers?q=${encodeURIComponent(query)}&items_per_page=50`);
  if (!res.ok) return res;

  const data = rec(res.data);
  const items = Array.isArray(data.items) ? data.items : [];
  const hits: OfficerHit[] = [];
  for (const raw of items) {
    const item = rec(raw);
    const officerId = officerIdFrom(item.links);
    const officerName = str(item.title);
    if (!officerId || !officerName) continue;
    hits.push({ officerName, officerId, dob: dobFrom(item.date_of_birth) });
  }
  return { ok: true, total: num(data.total_results) ?? hits.length, hits };
}

/** Everything one officer is or was appointed to. */
export async function officerAppointments(
  officerId: string,
): Promise<
  | { ok: true; dob?: { month: number; year: number }; appointments: CompanyAppointment[] }
  | { ok: false; reason: LookupFailure }
> {
  const res = await get(`/officers/${encodeURIComponent(officerId)}/appointments?items_per_page=50`);
  if (!res.ok) return res;

  const data = rec(res.data);
  const items = Array.isArray(data.items) ? data.items : [];
  const appointments: CompanyAppointment[] = [];
  for (const raw of items) {
    const item = rec(raw);
    const company = rec(item.appointed_to);
    const companyNumber = str(company.company_number);
    if (!companyNumber) continue;
    appointments.push({
      companyName: str(company.company_name) || "Unnamed company",
      companyNumber,
      companyStatus: str(company.company_status) || "unknown",
      role: str(item.officer_role) || "officer",
      appointedOn: str(item.appointed_on) || undefined,
      resignedOn: str(item.resigned_on) || undefined,
      nationality: str(item.nationality) || undefined,
      countryOfResidence: str(item.country_of_residence) || undefined,
    });
  }
  return { ok: true, dob: dobFrom(data.date_of_birth), appointments };
}

/**
 * Search by name, then keep only the officers the candidate's date of birth
 * corroborates — falling back to reporting name-only hits when we hold no date
 * of birth to narrow with.
 *
 * The date of birth is not always present on a search result, so an officer
 * without one is followed to their appointments, where it is, rather than
 * being discarded. Dropping them would quietly hide real matches.
 */
export async function findOfficerMatches(
  name: string,
  candidateDob: string | undefined,
): Promise<
  | { ok: true; total: number; matches: CompanyOfficerMatch[] }
  | { ok: false; reason: LookupFailure }
> {
  const search = await searchOfficers(name);
  if (!search.ok) return search;

  const haveDob = !!candidateDob;
  const matches: CompanyOfficerMatch[] = [];

  // With a date of birth to work with, officers whose published one already
  // contradicts it are dropped before we spend a request on them.
  const worthFollowing = haveDob
    ? search.hits.filter((h) => !h.dob || dobMatches(candidateDob, h.dob))
    : search.hits;

  for (const hit of worthFollowing.slice(0, MAX_FOLLOWED)) {
    const detail = await officerAppointments(hit.officerId);
    if (!detail.ok) continue;

    const dob = hit.dob ?? detail.dob;
    // Re-checked against the authoritative record, not just the search result.
    if (haveDob && !dobMatches(candidateDob, dob)) continue;

    matches.push({
      officerName: hit.officerName,
      officerId: hit.officerId,
      dob,
      confidence: haveDob ? "dob" : "name-only",
      appointments: detail.appointments,
    });
  }

  return { ok: true, total: search.total, matches };
}
