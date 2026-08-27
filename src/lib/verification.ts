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
import { phoneCountryMatches } from "@/lib/phoneCountry";

/** The two images a candidate provides. Both are required together. */
export const VERIFICATION_KINDS = ["identity", "selfie"] as const;

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
}

/** Are both images present and usable? */
export function hasBothImages(documents?: CandidateDocument[]): boolean {
  const usable = (kind: string) =>
    (documents ?? []).some((d) => d.kind === kind && d.status !== "blocked" && !!d.key);
  return usable("identity") && usable("selfie");
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
  if (c.verifiedAt) return "verified";
  if (c.rejectedAt) return "rejected";
  if (hasBothImages(c.documents)) return "provided";

  // Either signal is enough. Someone genuinely living abroad on their old
  // mobile is asked too; that is a deliberate trade, since the ask is one
  // extra step rather than a rejection.
  const byCountry = !!c.country && requiredCountries.includes(c.country);
  const byPhone = phoneCountryMatches(c.phone, requiredCountries);
  if (byCountry || byPhone || c.verificationRequestedAt) return "awaiting";
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

export const VERIFICATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "awaiting", label: "Awaiting upload" },
  { value: "provided", label: "Ready to review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
] as const;

export type VerificationFilter = (typeof VERIFICATION_FILTERS)[number]["value"];
