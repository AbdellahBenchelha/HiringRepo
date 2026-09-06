/**
 * The details a candidate re-confirms when they accept an offer.
 *
 * People fill an application form to get past it. Names get abbreviated,
 * addresses get typed as "-", dates of birth get invented. None of that
 * matters while they are one of forty applicants; all of it matters the moment
 * they are the person you are about to engage and pay.
 *
 * So this is collected separately and stored separately. The original
 * application is never overwritten — keeping both is the only way to see what
 * was wrong the first time, and the only way to be sure this step actually
 * changed something.
 *
 * Pure module: no filesystem, no node built-ins, so the form, the API route
 * and the admin panel can share one definition of what a valid submission is.
 */

export const ENGAGED_AS = ["Individual", "Company"] as const;
export type EngagedAs = (typeof ENGAGED_AS)[number];

export interface ConfirmedDetails {
  /** Whether they are contracting personally or through a company. */
  engagedAs: EngagedAs;
  /** Company fields, only when engagedAs is "Company". */
  companyName?: string;
  companyNumber?: string;
  /** Optional — not every jurisdiction issues one, and not every company registers. */
  companyVat?: string;

  firstName: string;
  lastName: string;
  /** ISO yyyy-mm-dd. */
  dob: string;
  nationality: string;
  /**
   * No longer collected. Present only on records made before the identity
   * photographs were introduced.
   *
   * Typing a passport number added nothing once the document itself is
   * photographed and checked by a person — the picture is the evidence, and a
   * number typed into a box is only a claim about it. It also asked for a
   * national identifier at the moment a candidate is deciding whether we are
   * genuine, which is the moment they are most right to hesitate; one of them
   * refused, and was correct to.
   *
   * Kept on the type so the values already on file still display. Nothing
   * writes it any more — validateConfirmed does not read it, so a client that
   * sends one is simply ignored.
   */
  idNumber?: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  postcode: string;
}

/** Everything the candidate can send us. Email is not here on purpose. */
export const CONFIRMED_FIELDS = [
  "engagedAs", "companyName", "companyNumber", "companyVat",
  "firstName", "lastName", "dob", "nationality", "idNumber",
  "phone", "country", "city", "address", "postcode",
] as const;

/** Labels for the admin panel and the diff, in the order they are shown. */
export const CONFIRMED_LABELS: Record<keyof ConfirmedDetails, string> = {
  engagedAs: "Engaged as",
  companyName: "Company name",
  companyNumber: "Company number",
  companyVat: "VAT / tax number",
  firstName: "First name",
  lastName: "Last name",
  dob: "Date of birth",
  nationality: "Nationality",
  /** Historic only — see ConfirmedDetails.idNumber. */
  idNumber: "ID / passport number",
  phone: "Phone",
  country: "Country",
  city: "City",
  address: "Full address",
  postcode: "Postcode",
};

const MAX = 200;

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, MAX) : "";
}

/**
 * Validate a submission and return it normalised, or the list of what is
 * wrong. Both the browser and the server run this — the browser so the
 * candidate is told before submitting, the server because a browser check is
 * a courtesy, not a control.
 */
export function validateConfirmed(
  input: Record<string, unknown>,
): { ok: true; details: ConfirmedDetails } | { ok: false; problems: string[] } {
  const problems: string[] = [];

  const engagedAs = clean(input.engagedAs) as EngagedAs;
  if (!ENGAGED_AS.includes(engagedAs)) problems.push("Choose whether you are an individual or a company.");

  const required: [keyof ConfirmedDetails, string][] = [
    ["firstName", "First name"],
    ["lastName", "Last name"],
    ["dob", "Date of birth"],
    ["nationality", "Nationality"],
    ["phone", "Phone number"],
    ["country", "Country"],
    ["city", "City"],
    ["address", "Full address"],
    ["postcode", "Postcode"],
  ];

  const out: Record<string, string> = { engagedAs };
  for (const [key, label] of required) {
    const value = clean(input[key]);
    if (!value) problems.push(`${label} is required.`);
    out[key] = value;
  }

  // A date of birth is the field most likely to be nonsense, and the one that
  // matters for a contract. Reject the impossible rather than storing it.
  if (out.dob) {
    const t = Date.parse(`${out.dob}T00:00:00Z`);
    if (Number.isNaN(t)) {
      problems.push("Date of birth is not a valid date.");
    } else {
      const years = (Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000);
      if (years < 16) problems.push("You must be at least 16 years old.");
      if (years > 100) problems.push("Please check your date of birth.");
    }
  }

  if (engagedAs === "Company") {
    for (const [key, label] of [["companyName", "Company name"], ["companyNumber", "Company number"]] as const) {
      const value = clean(input[key]);
      if (!value) problems.push(`${label} is required when contracting through a company.`);
      out[key] = value;
    }
    const vat = clean(input.companyVat);
    if (vat) out.companyVat = vat;
  }

  if (problems.length) return { ok: false, problems };
  return { ok: true, details: out as unknown as ConfirmedDetails };
}

export interface FieldChange {
  label: string;
  was: string;
  now: string;
}

/**
 * What the candidate corrected.
 *
 * This is the point of the whole step: a recruiter needs to see that the
 * address on file was "asdf" and is now a real one. Fields with nothing to
 * compare against are skipped rather than shown as changes from blank — an
 * empty original means we never asked, not that they altered anything.
 */
export function detailChanges(
  original: {
    firstName?: string; lastName?: string; dob?: string;
    phone?: string; country?: string; city?: string; address?: string;
  },
  confirmed: ConfirmedDetails,
): FieldChange[] {
  const pairs: [keyof ConfirmedDetails, string | undefined][] = [
    ["firstName", original.firstName],
    ["lastName", original.lastName],
    ["dob", original.dob],
    ["phone", original.phone],
    ["country", original.country],
    ["city", original.city],
    ["address", original.address],
  ];

  const changes: FieldChange[] = [];
  for (const [key, before] of pairs) {
    const was = (before ?? "").trim();
    const now = (confirmed[key] ?? "").toString().trim();
    if (!was || !now) continue;
    // Case and spacing are not corrections worth a recruiter's attention.
    if (was.toLowerCase().replace(/\s+/g, " ") === now.toLowerCase().replace(/\s+/g, " ")) continue;
    changes.push({ label: CONFIRMED_LABELS[key], was, now });
  }
  return changes;
}
