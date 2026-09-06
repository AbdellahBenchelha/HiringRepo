/**
 * Identity verification — the shared model.
 *
 * Pure module: no filesystem, no node built-ins, so the assessment page, the
 * upload routes and the Admin Panel all agree on what "verified" means from
 * one definition.
 *
 * Only some countries require this. The list is editable in the Admin Panel
 * rather than compiled in, because which countries need it is a recruiting
 * decision that changes without a deploy.
 */
import type { CandidateDocument } from "@/lib/documents";
import { countryRuleApplies } from "@/lib/phoneCountry";
import { hasIdentityImages, type IdDocumentType } from "@/lib/identityDocuments";

/**
 * Every image kind the identity check can involve.
 *
 * Which of them a given candidate owes depends on the document they chose —
 * see requiredKinds in identityDocuments.ts. This is the superset, for code
 * that has to recognise an identity photograph without knowing whose it is.
 */
export const VERIFICATION_KINDS = ["identity", "identityBack", "selfie"] as const;

export function isVerificationKind(kind: string): boolean {
  return (VERIFICATION_KINDS as readonly string[]).includes(kind);
}

export type VerificationStatus =
  /** Their country does not require it and nobody has asked. */
  | "not_required"
  /** Required, and we are waiting for them. */
  | "awaiting"
  /** Both images are in. A person has to look at them. */
  | "provided"
  | "verified"
  | "rejected";

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  not_required: "Not required",
  awaiting: "Awaiting upload",
  provided: "Ready to review",
  verified: "Verified",
  rejected: "Rejected",
};

export interface VerificationInput {
  country?: string;
  /**
   * Counted alongside the stated country. Selecting a country that requires
   * nothing while entering a number from one that does is the obvious way
   * around this, and a rule keyed only on the dropdown is one click from
   * being useless.
   */
  phone?: string;
  documents?: CandidateDocument[];
  verifiedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  /** Images cleared by hand after a decision. The decision itself survives. */
  imagesDeletedAt?: string;
  /** Set when a recruiter asks someone whose country is not on the list. */
  verificationRequestedAt?: string;
  /** Which document they chose. Absent for anyone who uploaded before the picker. */
  identityDocumentType?: IdDocumentType;
  /** When a recruiter last asked for the photographs to be taken again. */
  identityReuploadRequestedAt?: string;
  /** What was wrong with them, in words the candidate is shown. */
  identityReuploadReason?: string;
}

/** Are the photographs their chosen document requires present and usable? */
export function hasBothImages(
  documents?: CandidateDocument[],
  type?: IdDocumentType,
): boolean {
  return hasIdentityImages(documents, type);
}

/**
 * Has a recruiter asked for new photographs that have not arrived yet?
 *
 * Compared against the newest photograph on file rather than stored as a flag
 * someone has to remember to clear. A flag would leave a candidate stuck on
 * "please upload again" after they already had, and the one thing worse than
 * asking twice is asking again after they did as they were told.
 *
 * Ties count as pending. Same-second timestamps mean the upload and the
 * request crossed, and in that case the photographs are the ones the recruiter
 * was looking at when they asked — not an answer to the request.
 */
export function identityReuploadPending(c: VerificationInput): boolean {
  const asked = c.identityReuploadRequestedAt;
  if (!asked) return false;
  const newest = (c.documents ?? [])
    .filter((d) => (VERIFICATION_KINDS as readonly string[]).includes(d.kind) && !!d.key)
    .map((d) => d.uploadedAt)
    .sort()
    .at(-1);
  return !newest || newest <= asked;
}

/**
 * The reasons a recruiter can give for asking again.
 *
 * A fixed list rather than free text alone, because these go to the candidate
 * verbatim: a reason typed in a hurry lands in someone's inbox as the official
 * word on why their documents were refused. Each one says what to do next,
 * since "rejected" without an instruction just produces a reply asking what to
 * send instead.
 */
export const REUPLOAD_REASONS = [
  {
    value: "unreadable",
    label: "ID photo not clear enough",
    message:
      "The photo of your ID document is not clear enough for us to read. Please take a new one in good light, with all four corners of the document in the picture and no glare across it.",
  },
  {
    value: "wrong-document",
    label: "Wrong kind of document",
    message:
      "The document you sent is not one we can accept. We can only accept a passport, a national identity card or a driver's licence. Please send one of those three.",
  },
  {
    value: "missing-back",
    label: "Back of the card missing",
    message:
      "We have the front of your card but not the back. Please send both sides — for an identity card or a driver's licence we need each side as a separate photo.",
  },
  {
    value: "selfie-unclear",
    label: "Photo holding the ID not clear",
    message:
      "The photo of you holding your ID is not clear enough. Please take a new one where your face and the document are both in focus, and the details on the document can be read.",
  },
  {
    value: "expired",
    label: "Document has expired",
    message:
      "The document you sent has expired. Please send a current one — a passport, a national identity card or a driver's licence that is still valid.",
  },
  {
    value: "mismatch",
    label: "Details do not match the application",
    message:
      "The name or date of birth on the document does not match the details on your application. Please send a document in your own name, or reply to this email and tell us which is correct.",
  },
] as const;

export type ReuploadReasonValue = (typeof REUPLOAD_REASONS)[number]["value"];

/** The wording for a preset, or the recruiter's own words, trimmed and capped. */
export function reuploadMessage(value: string, custom?: string): string {
  const preset = REUPLOAD_REASONS.find((r) => r.value === value);
  if (preset) return preset.message;
  return (custom ?? "").trim().slice(0, 400);
}

/**
 * Is this candidate subject to identity verification at all?
 *
 * Country or dialling code — the same pair the status below uses, but without
 * regard to how far along they are. Callers that want "does this rule touch
 * this person" rather than "what is their current state" want this one.
 */
export function verificationApplies(
  c: VerificationInput,
  requiredCountries: readonly string[],
): boolean {
  return countryRuleApplies(c.country, c.phone, requiredCountries);
}

/**
 * Where a candidate stands.
 *
 * Derived rather than stored, because "not required" depends on a country list
 * that changes. A stored flag would say "not required" forever for someone
 * whose country was added to the list afterwards.
 */
export function verificationStatus(
  c: VerificationInput,
  requiredCountries: readonly string[],
): VerificationStatus {
  // A pending re-request outranks everything below it. Someone asked for a
  // clearer photograph is waiting on us for nothing and on themselves for a
  // photograph — showing them as "Ready to review" would put them back in the
  // review queue with the very images that were just refused.
  if (identityReuploadPending(c)) return "awaiting";
  if (c.verifiedAt) return "verified";
  if (c.rejectedAt) return "rejected";
  if (hasBothImages(c.documents, c.identityDocumentType)) return "provided";

  // Either signal is enough. Someone genuinely living abroad on their old
  // mobile is asked too; that is a deliberate trade, since the ask is one
  // extra step rather than a rejection.
  if (verificationApplies(c, requiredCountries) || c.verificationRequestedAt) return "awaiting";
  return "not_required";
}

/** Does this candidate have to verify before their application can proceed? */
export function verificationRequired(
  c: VerificationInput,
  requiredCountries: readonly string[],
): boolean {
  const status = verificationStatus(c, requiredCountries);
  return status === "awaiting";
}

/**
 * Does this person still owe us an identity check before we contract with them?
 *
 * The country list decides who is asked *early*, as a filter before the
 * assessment. This is the second gate, at the offer: it applies to everyone,
 * because signing an agreement with someone whose identity has never been
 * checked is not something a country list should be able to permit.
 *
 * Three ways to already be finished, and the third is the one that is easy to
 * miss: a verified candidate's images are **deleted** once the decision is
 * made, and only the outcome is kept. Asking "are the files there?" alone
 * would send everyone we had already verified round again for photographs we
 * deliberately destroyed.
 */
export function identityStillNeeded(c: VerificationInput): boolean {
  // Asked again beats all three. A recruiter looking at a passport photograph
  // too blurred to read has to be able to reopen this for someone already
  // marked verified, or the only route left is deleting the evidence first.
  if (identityReuploadPending(c)) return true;
  if (c.verifiedAt || c.rejectedAt) return false;
  return !hasBothImages(c.documents, c.identityDocumentType);
}

export const VERIFICATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting upload" },
  { value: "provided", label: "Ready to review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export type VerificationFilter = (typeof VERIFICATION_FILTERS)[number]["value"];
