/**
 * Matching a candidate against the UK register of company officers.
 *
 * Pure module — no filesystem, no node built-ins, no network — so the API
 * route, the admin panel and the tests share one definition of what counts as
 * a match.
 *
 * The whole difficulty is that a name is not an identity. "John Smith" is
 * hundreds of directors, and presenting any one of them as "this candidate's
 * company" would be a fabrication dressed as a fact. Companies House publishes
 * each officer's month and year of birth, though — the day is suppressed — and
 * that turns a useless name search into a usable one.
 *
 * So every result carries how it was matched, and nothing here ever decides
 * anything. It is a prompt to open the register and look.
 */

/** One directorship or secretaryship. */
export interface CompanyAppointment {
  companyName: string;
  companyNumber: string;
  /** "active", "dissolved", "liquidation" … as the register words it. */
  companyStatus: string;
  role: string;
  appointedOn?: string;
  resignedOn?: string;
  nationality?: string;
  countryOfResidence?: string;
}

/**
 * How confident we are that this officer is the candidate.
 *
 * Two levels only, because there is no honest third: either the birth month
 * and year corroborate the name, or they do not and all we have is a name.
 */
export type MatchConfidence = "dob" | "name-only";

export interface CompanyOfficerMatch {
  /** As the register writes it, e.g. "SMITH, John David". */
  officerName: string;
  officerId: string;
  dob?: { month: number; year: number };
  confidence: MatchConfidence;
  appointments: CompanyAppointment[];
}

export interface CompanyCheck {
  checkedAt: string;
  /** The name that was searched, so a later reader knows what was asked. */
  searchedName: string;
  /** The candidate's date of birth used to narrow it, when we had one. */
  usedDob?: string;
  /** How many officers the register returned for the name, before narrowing. */
  totalNameHits: number;
  matches: CompanyOfficerMatch[];
  /**
   * Set when the lookup itself failed. Distinct from an empty `matches`,
   * which means we looked and found nobody — the difference decides whether
   * checking again is worth anything.
   */
  error?: string;
}

/** Month and year from an ISO yyyy-mm-dd, or null if it is not a date. */
export function dobParts(iso: string | undefined | null): { month: number; year: number } | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

/** Does an officer's published birth month and year match the candidate's? */
export function dobMatches(
  candidateDob: string | undefined | null,
  officerDob: { month?: number; year?: number } | undefined | null,
): boolean {
  const want = dobParts(candidateDob);
  if (!want || !officerDob) return false;
  return officerDob.month === want.month && officerDob.year === want.year;
}

/**
 * The name to search the register with.
 *
 * Prefers what the candidate confirmed when accepting an offer over what they
 * typed on the application: the first is the name they gave for a contract,
 * the second may be an initial or a nickname.
 */
export function searchNameFor(c: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  confirmedDetails?: { firstName?: string; lastName?: string };
}): string {
  const confirmed = `${c.confirmedDetails?.firstName ?? ""} ${c.confirmedDetails?.lastName ?? ""}`.trim();
  if (confirmed) return confirmed;
  const applied = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  if (applied) return applied;
  return (c.fullName ?? "").trim();
}

/** Appointments that are current: not resigned, and the company still alive. */
export function activeAppointments(m: CompanyOfficerMatch): CompanyAppointment[] {
  return m.appointments.filter((a) => !a.resignedOn && a.companyStatus === "active");
}

/**
 * Which of four answers a stored check amounts to.
 *
 * Split out because scanning a page at a time makes the distinction matter
 * more, not less. One name-only hit read on its own profile invites a second
 * look; twenty-five of them in a list read as twenty-five findings unless
 * something keeps them apart, and a common name will produce them all day.
 * "Nothing found" and "we could not ask" have to stay separate for the same
 * reason — folding a failed lookup into "no match" is how a rate limit turns
 * into a page of clean bills of health.
 */
export type CheckOutcome = "confirmed" | "name-only" | "none" | "failed";

export function classifyCheck(check: CompanyCheck | undefined): CheckOutcome | null {
  if (!check) return null;
  if (check.error) return "failed";
  if (check.matches.length === 0) return "none";
  return check.matches.every((m) => m.confidence === "dob") ? "confirmed" : "name-only";
}

/**
 * A one-line summary for the table and the CSV export.
 *
 * Says which kind of match it was, because "2 companies" read without that
 * qualification is exactly the overstatement this module exists to avoid.
 */
export function summariseCheck(check: CompanyCheck | undefined): string {
  if (!check) return "";
  if (check.error) return `Check failed (${check.error})`;
  if (check.matches.length === 0) {
    return check.totalNameHits > 0
      ? `No match (${check.totalNameHits} same-name officer${check.totalNameHits === 1 ? "" : "s"}, none matching date of birth)`
      : "No match";
  }
  const active = check.matches.reduce((n, m) => n + activeAppointments(m).length, 0);
  const total = check.matches.reduce((n, m) => n + m.appointments.length, 0);
  const kind = check.matches.every((m) => m.confidence === "dob")
    ? "date of birth matched"
    : "name only — unverified";
  return `${active} active of ${total} appointment${total === 1 ? "" : "s"} (${kind})`;
}
