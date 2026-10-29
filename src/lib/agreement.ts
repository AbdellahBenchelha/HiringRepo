/**
 * The final agreement: the Independent Contractor Agreement sent to a Full
 * verified candidate to sign, and the signed copy they send back.
 *
 * Pure, shared by the PDF, the emails, the candidate's upload page, its API,
 * the Admin Panel and the bulk sender, so all of them agree on what goes in
 * the agreement, whether it can be sent, and where it stands.
 *
 * The agreement is the published specimen (public/sample-contractor-agreement…)
 * with the square brackets filled: personal details from what the candidate
 * confirmed when accepting, terms from the offer they accepted, and the terms
 * that are the same for everyone from siteConfig.agreement.
 *
 * Every agreement sent is kept as the exact PDF that was emailed, with a
 * reference printed on each page, so what a candidate signed can always be
 * compared with what we sent.
 */
import { siteConfig } from "@/config/site";
import { DAY_LABELS, sortDays, type Availability } from "@/lib/availability";
import { effectiveOffer, type Offer } from "@/lib/offer";
import { addressOnFile } from "@/lib/addressProof";
import { FULL_VERIFIED } from "@/lib/candidateStatus";
import type { ConfirmedDetails } from "@/lib/hiring";
import type { CompanyDetails } from "@/lib/companyDetails";

/** Signed copies a candidate may upload in one go — one photo per page of six, or a PDF. */
export const MAX_SIGNED_FILES = 6;

/* -------------------------------------------------------------------------- */
/* What the candidate record must hold                                         */
/* -------------------------------------------------------------------------- */

export interface AgreementCandidate {
  id: string;
  status?: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  country?: string;
  offer?: Offer;
  offerAcceptedAt?: string;
  confirmedDetails?: ConfirmedDetails;
  companyDetails?: CompanyDetails;
  availability?: Availability;
  addressProofApprovedAt?: string;
  addressProofSubmissions?: { at: string; address: string }[];
}

/** The square brackets of the specimen, filled. */
export interface AgreementTerms {
  /** The person signing, as on their documents. */
  contractorName: string;
  /** "Aisha Benali of 12 Rue Atlas, Casablanca 20330, Morocco", or the company form. */
  contractorParty: string;
  /** Present when the contractor engages through a company. */
  companyName?: string;
  startDate: string;
  services: string;
  fee: string;
  guaranteedHours: string;
  window: string;
  days: string;
  payment: string;
  notice: string;
  governingLaw: string;
  signatoryName: string;
  signatoryTitle: string;
}

/** The legal name, as they confirmed it on accepting (the application's otherwise). */
export function contractorName(c: AgreementCandidate): string {
  const d = c.confirmedDetails;
  const confirmed = d ? `${d.firstName ?? ""} ${d.lastName ?? ""}`.replace(/\s+/g, " ").trim() : "";
  return confirmed || c.fullName?.trim() || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

/**
 * The home address for the agreement. An approved proof of address wins: the
 * address the candidate typed beside it is the one their bill shows, which a
 * recruiter has now checked.
 */
export function contractorAddress(c: AgreementCandidate): string {
  if (c.addressProofApprovedAt) {
    const typed = c.addressProofSubmissions?.at(-1)?.address?.trim();
    if (typed) return typed;
  }
  return addressOnFile(c);
}

function companyOf(c: AgreementCandidate): { name: string; number: string; address: string } | null {
  const cd = c.companyDetails;
  if (cd?.companyName) {
    const street = [cd.street, cd.suite].filter(Boolean).join(", ");
    const address = [street, cd.city, [cd.state, cd.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    return { name: cd.companyName.trim(), number: (cd.companyNumber ?? "").trim(), address };
  }
  const d = c.confirmedDetails;
  if (d?.engagedAs === "Company" && d.companyName) {
    return { name: d.companyName.trim(), number: (d.companyNumber ?? "").trim(), address: "" };
  }
  return null;
}

const CURRENCY_NAMES: Record<string, string> = {
  USD: "US dollars",
  GBP: "pounds sterling",
  EUR: "euros",
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const UNIT_WORDS: Record<string, string> = { HOUR: "hour worked", DAY: "day", WEEK: "week", MONTH: "month", YEAR: "year" };

/** "2 November 2026". */
export function formatAgreementDate(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/**
 * What stops an agreement being drawn up for this candidate, in words a
 * recruiter reads. Empty when it can be sent.
 */
export function agreementMissing(c: AgreementCandidate): string[] {
  const out: string[] = [];
  if (c.status !== FULL_VERIFIED) out.push("the candidate is not Full verified");
  if (!c.offer || !c.offerAcceptedAt) out.push("no accepted offer");
  else {
    if (!effectiveOffer(c.offer).hoursPerWeek) out.push("the offer has no weekly hours");
    if (!c.offer.startDate) out.push("the offer has no start date");
  }
  if (!contractorName(c)) out.push("no name");
  if (!contractorAddress(c) && !companyOf(c)?.address) out.push("no address");
  if (!c.availability) out.push("no work hours and days chosen");
  if (!(c.email ?? "").includes("@")) out.push("no email address");
  return out;
}

/** The filled terms, or null when something in agreementMissing is missing. */
export function agreementTerms(c: AgreementCandidate): AgreementTerms | null {
  if (!c.offer || !c.availability || !c.offer.startDate) return null;
  const offer = effectiveOffer(c.offer);
  if (!offer.hoursPerWeek) return null;
  const name = contractorName(c);
  if (!name) return null;
  const home = contractorAddress(c);
  const company = companyOf(c);

  let party: string;
  if (company) {
    const number = company.number ? `, registered under number ${company.number}` : "";
    const where = company.address || home;
    party = `${company.name}${number}${where ? `, of ${where}` : ""}, acting through ${name}`;
  } else {
    if (!home) return null;
    party = `${name} of ${home}`;
  }

  const a = c.availability;
  const currency = (offer.currency || "USD").toUpperCase();
  const currencyName = CURRENCY_NAMES[currency] ? `${CURRENCY_NAMES[currency]} (${currency})` : currency;
  const t = siteConfig.agreement;
  return {
    contractorName: name,
    contractorParty: party,
    companyName: company?.name,
    startDate: formatAgreementDate(offer.startDate!),
    services: offer.position,
    fee: `${money(offer.rate, currency)} per ${UNIT_WORDS[offer.unit] ?? "hour worked"}, in ${currencyName}`,
    guaranteedHours: `${offer.hoursPerWeek} hours per week, guaranteed under clause 6`,
    window: `${a.startTime} to ${a.endTime} ${a.timeZone} — an 8-hour window, chosen by you`,
    days: sortDays(a.days)
      .map((d) => DAY_LABELS[d])
      .join(", "),
    payment: `Within ${t.paymentWorkingDays} working days of a correct invoice, by bank transfer`,
    notice: `${t.noticeDays} days, by either party, in writing`,
    governingLaw: t.governingLaw,
    signatoryName: t.signatoryName,
    signatoryTitle: t.signatoryTitle,
  };
}

/** Printed on every page and in the emails: which agreement this is. */
export function agreementRef(id: string, sentAt: string): string {
  return `WR-${id.slice(0, 8).toUpperCase()}-${sentAt.slice(0, 10).replace(/-/g, "")}`;
}

/* -------------------------------------------------------------------------- */
/* Where it stands                                                             */
/* -------------------------------------------------------------------------- */

/** One email about it. */
export interface AgreementEvent {
  at: string;
  by?: string;
  kind: "sent" | "reminder" | "reask";
  /** Only on "reask": what the candidate was told. */
  reason?: string;
  /** Only on "sent": the reference and the stored copy of what was emailed. */
  ref?: string;
  key?: string;
}

/** The signed copy, once: the files, and how it reached us. */
export interface AgreementSubmission {
  at: string;
  /** Storage keys of the signed files, in the order they were sent. */
  keys: string[];
  via: "upload" | "admin";
  by?: string;
}

export interface AgreementInput {
  agreementSentAt?: string;
  agreementSignedAt?: string;
  agreementApprovedAt?: string;
}

export type AgreementStatus =
  /** Nothing sent yet. */
  | "not_sent"
  /** Sent (or asked again), nothing signed back since. */
  | "sent"
  /** A signed copy arrived and is waiting for a recruiter. */
  | "signed"
  /** A recruiter accepted the signed copy. */
  | "approved";

export function agreementStatus(c: AgreementInput): AgreementStatus {
  const sent = c.agreementSentAt;
  const signed = c.agreementSignedAt;
  if (!sent) return signed ? (c.agreementApprovedAt ? "approved" : "signed") : "not_sent";
  if (!signed || signed < sent) return "sent";
  return c.agreementApprovedAt && c.agreementApprovedAt >= signed ? "approved" : "signed";
}

export const AGREEMENT_STATUS_LABEL: Record<AgreementStatus, string> = {
  not_sent: "Not sent",
  sent: "Sent – waiting",
  signed: "Signed – to check",
  approved: "Accepted",
};

/** Why a signed copy is sent back — what the recruiter picks, and what the candidate reads. */
export const AGREEMENT_REASK_REASONS = [
  {
    value: "unsigned",
    label: "Not signed",
    message: "The agreement you sent is not signed. Please sign it where it says “The Contractor” and send it again.",
  },
  {
    value: "pages",
    label: "Pages missing",
    message: "Some pages of the agreement are missing. Please send every page.",
  },
  {
    value: "unreadable",
    label: "Not readable",
    message: "The copy you sent is not clear enough to read. Please send a clearer scan or photo.",
  },
  {
    value: "date",
    label: "Date missing",
    message: "Please write the date next to your signature and send the agreement again.",
  },
] as const;

export const MAX_AGREEMENT_REASON = 300;

/** The wording for a preset, or the recruiter's own words, trimmed and capped. */
export function agreementReaskMessage(value: string, custom?: string): string {
  const preset = AGREEMENT_REASK_REASONS.find((r) => r.value === value);
  if (preset) return preset.message;
  return (custom ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_AGREEMENT_REASON);
}
