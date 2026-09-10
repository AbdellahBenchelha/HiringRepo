import { COMPANY_KINDS, type CandidateDocument } from "@/lib/documents";

/**
 * The details of a company a candidate contracts through.
 *
 * Somebody accepting as a company is not the party to the agreement — their
 * company is. So the name on the contract, the address the invoices carry and
 * the number the payments are reported under all belong to something we have
 * only been told about in two boxes on an acceptance form. This is where that
 * becomes evidence.
 *
 * Pure module — no filesystem, no node built-ins — so the candidate's form,
 * the route that stores it and the Admin Panel agree on what counts as
 * complete.
 *
 * Shaped for a US LLC: an EIN and a state. A company registered elsewhere gets
 * the same link and will not have either, and the page says so and tells them
 * to reply instead of leaving them stuck in a form that cannot be finished.
 */

export const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" }, { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" }, { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" }, { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" }, { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const STATE_CODES = new Set(US_STATES.map((s) => s.code));

export interface CompanyDetails {
  companyName: string;
  /** State filing number, as issued. Formats differ by state, so it is not parsed. */
  companyNumber: string;
  /** "12-3456789". */
  ein: string;
  street: string;
  suite?: string;
  city: string;
  state: string;
  zip: string;
  /**
   * Whether the company has a website — answered either way, never skipped.
   *
   * A company with no web presence at all is perfectly ordinary for a
   * single-member LLC formed to invoice through, so "no" is a real answer
   * rather than a failure. What is not acceptable is silence: with neither a
   * site nor a description we would be contracting with a name on a
   * certificate and nothing else.
   *
   * Absent on records confirmed before this was asked, so read it defensively.
   */
  hasWebsite?: "yes" | "no";
  /** Present when hasWebsite is "yes". Normalised to include the scheme. */
  website?: string;
  /** Present when hasWebsite is "no". What the company actually does. */
  activity?: string;
}

export const COMPANY_LABELS: Record<keyof CompanyDetails, string> = {
  companyName: "Company name",
  companyNumber: "Company number",
  ein: "EIN",
  street: "Street address",
  suite: "Suite / unit",
  city: "City",
  state: "State",
  zip: "ZIP code",
  hasWebsite: "Has a website",
  website: "Company website",
  activity: "What the company does",
};

const MAX = 200;

/** Long enough for a paragraph, bounded so the record cannot be used as storage. */
const MAX_TEXT = 1500;

/** A description shorter than this is not a description. */
const MIN_ACTIVITY = 20;

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, MAX) : "";
}

function cleanText(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\r\n/g, "\n").slice(0, MAX_TEXT) : "";
}

/**
 * What people type is "acme.com", not "https://acme.com".
 *
 * Rejecting the shorter form would be pedantry — the scheme is the one part of
 * a web address nobody says out loud — so it is added rather than demanded.
 */
export function normaliseWebsite(input: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function isValidWebsite(input: string): boolean {
  const value = normaliseWebsite(input);
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // A hostname with no dot is a machine name on somebody's own network, not
    // a company's website. Trailing dots and spaces are typing slips.
    const host = url.hostname.replace(/\.$/, "");
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host);
  } catch {
    return false;
  }
}

/** "123456789" or "12-3456789" both arrive; one shape is stored. */
export function formatEin(input: string): string {
  const digits = (input ?? "").replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function isValidEin(input: string): boolean {
  return /^\d{2}-\d{7}$/.test(formatEin(input));
}

/** Five digits, or the nine-digit form with its hyphen. */
export function isValidZip(input: string): boolean {
  return /^\d{5}(-\d{4})?$/.test((input ?? "").trim());
}

export type CompanyCheckResult =
  | { ok: true; details: CompanyDetails }
  | { ok: false; problems: string[] };

/**
 * Validate a submission and return it normalised.
 *
 * Run in the browser so the candidate is told before a round trip, and again
 * on the server, because a browser check is a courtesy rather than a control —
 * and this one decides what goes on a contract.
 */
export function validateCompanyDetails(input: Record<string, unknown>): CompanyCheckResult {
  const problems: string[] = [];
  const out: Record<string, string> = {};

  for (const [key, label] of [
    ["companyName", "Company name"],
    ["companyNumber", "Company number"],
    ["street", "Street address"],
    ["city", "City"],
  ] as const) {
    const value = clean(input[key]);
    if (!value) problems.push(`${label} is required.`);
    out[key] = value;
  }

  const suite = clean(input.suite);
  if (suite) out.suite = suite;

  const ein = formatEin(clean(input.ein));
  if (!ein) problems.push("EIN is required.");
  else if (!isValidEin(ein)) problems.push("EIN should be nine digits, like 12-3456789.");
  out.ein = ein;

  const state = clean(input.state).toUpperCase();
  if (!state) problems.push("State is required.");
  else if (!STATE_CODES.has(state)) problems.push("Choose the state from the list.");
  out.state = state;

  const zip = clean(input.zip);
  if (!zip) problems.push("ZIP code is required.");
  else if (!isValidZip(zip)) problems.push("ZIP code should be five digits, like 90210.");
  out.zip = zip;

  // One of the two, decided by the answer above. Whichever branch is taken has
  // to be filled in: the point is that something describes the company beyond
  // its name, and an unanswered question would let both be skipped.
  const hasWebsite = clean(input.hasWebsite).toLowerCase();
  if (hasWebsite !== "yes" && hasWebsite !== "no") {
    problems.push("Tell us whether the company has a website.");
  } else {
    out.hasWebsite = hasWebsite;
    if (hasWebsite === "yes") {
      const website = clean(input.website);
      if (!website) problems.push("Company website is required.");
      else if (!isValidWebsite(website)) {
        problems.push("That does not look like a web address — for example acme.com.");
      } else out.website = normaliseWebsite(website);
    } else {
      const activity = cleanText(input.activity);
      if (!activity) problems.push("Tell us what the company does.");
      else if (activity.length < MIN_ACTIVITY) {
        problems.push("Please describe what the company does in a sentence or two.");
      } else out.activity = activity;
    }
  }

  if (problems.length) return { ok: false, problems };
  return { ok: true, details: out as unknown as CompanyDetails };
}

/**
 * The paperwork that must be on file before an agreement can be drawn up.
 *
 * The W-9 is first for a reason: it carries the name, the EIN and the address
 * certified under penalty of perjury, which turns everything typed into the
 * form above into a cross-check rather than the only evidence. The certificate
 * of formation proves the company exists. The EIN letter is optional because a
 * signed W-9 already states the EIN.
 */
export const REQUIRED_COMPANY_DOCS = ["w9", "formation"] as const;

export const COMPANY_DOC_HINT: Record<(typeof COMPANY_KINDS)[number], string> = {
  w9: "The signed IRS form giving your company's name, EIN and address.",
  formation:
    "The document your state issued when the LLC was formed — Certificate of Formation or Articles of Organization.",
  einLetter: "Optional. The IRS letter confirming your EIN (CP 575, or a 147C replacement).",
};

export function hasCompanyDoc(documents: CandidateDocument[] | undefined, kind: string): boolean {
  return (documents ?? []).some(
    (d) => d.kind === kind && !d.supersededAt && d.status !== "blocked" && !!d.key,
  );
}

export function missingCompanyDocs(documents?: CandidateDocument[]): string[] {
  return REQUIRED_COMPANY_DOCS.filter((k) => !hasCompanyDoc(documents, k));
}

export interface CompanyState {
  confirmedDetails?: { engagedAs?: string };
  companyDetails?: CompanyDetails;
  companyDetailsAt?: string;
  documents?: CandidateDocument[];
  offerAcceptedAt?: string;
}

/** Did this candidate accept through a company rather than in their own name? */
export function acceptedAsCompany(c: CompanyState): boolean {
  return !!c.offerAcceptedAt && c.confirmedDetails?.engagedAs === "Company";
}

/**
 * Is anything still outstanding before an agreement can be issued?
 *
 * Both halves: the typed details and the paperwork. Either alone leaves the
 * agreement being drawn up for a company we have a claim about but no evidence
 * of.
 */
export function companyDetailsNeeded(c: CompanyState): boolean {
  if (!acceptedAsCompany(c)) return false;
  return !c.companyDetails || missingCompanyDocs(c.documents).length > 0;
}

export interface FieldChange {
  label: string;
  was: string;
  now: string;
}

/**
 * What the confirmation changed from what they typed when accepting.
 *
 * The point of asking again. A company number typed in a hurry on an
 * acceptance form and the one on the state's own certificate are often not the
 * same string, and the difference is what the agreement depends on.
 */
export function companyChanges(
  accepted: { companyName?: string; companyNumber?: string } | undefined,
  confirmed: CompanyDetails,
): FieldChange[] {
  const pairs: [keyof CompanyDetails, string | undefined][] = [
    ["companyName", accepted?.companyName],
    ["companyNumber", accepted?.companyNumber],
  ];
  const changes: FieldChange[] = [];
  for (const [key, before] of pairs) {
    const was = (before ?? "").trim();
    const now = (confirmed[key] ?? "").toString().trim();
    if (!was || !now) continue;
    if (was.toLowerCase().replace(/\s+/g, " ") === now.toLowerCase().replace(/\s+/g, " ")) continue;
    changes.push({ label: COMPANY_LABELS[key], was, now });
  }
  return changes;
}

/** One line for the panel. */
export function formatCompanyAddress(d: CompanyDetails): string {
  return [d.street, d.suite, `${d.city}, ${d.state} ${d.zip}`].filter(Boolean).join(", ");
}
