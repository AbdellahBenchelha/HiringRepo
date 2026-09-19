/**
 * Proof of residence — the shared model.
 *
 * Pure module: no filesystem, no node built-ins, so the upload card, the
 * routes and the Admin Panel all agree on what "proven" means from one
 * definition.
 *
 * Why this exists at all. The identity check proves who somebody is and which
 * country issued their document; it says nothing about where they live. Those
 * two are routinely different — an Indian passport held by somebody living in
 * China is an ordinary situation, not a suspicious one — and the written
 * agreement carries a residence address, not a nationality. So for those
 * candidates the address is the claim that has no evidence behind it, and this
 * is the evidence.
 *
 * Never automatic. The request is always made by a recruiter who has looked at
 * the documents, because the mismatch this is for is common and usually
 * innocent, and a rule that emailed everybody whose passport and address
 * disagreed would spend its time troubling expats.
 */
import { currentDocument, type CandidateDocument } from "@/lib/documents";

/** The pair asked for: the permit, and the candidate holding it. */
export const RESIDENCE_KINDS = ["residencePermit", "residenceSelfie"] as const;

export function isResidenceKind(kind: string): boolean {
  return (RESIDENCE_KINDS as readonly string[]).includes(kind);
}

export type ResidenceStatus =
  /** Nobody has asked. The ordinary state for almost everyone. */
  | "not_asked"
  /** Asked, and nothing has come back. */
  | "awaiting"
  /** Both photographs are in. A person has to look at them. */
  | "provided"
  /**
   * They have no permit and have written why they are in the country.
   *
   * Its own state rather than folded into "provided", because what it asks of
   * a recruiter is different: there is nothing to look at, there is something
   * to read and a judgement to make about whether it is good enough.
   */
  | "explained"
  | "verified"
  | "rejected";

export const RESIDENCE_LABEL: Record<ResidenceStatus, string> = {
  not_asked: "Not asked",
  awaiting: "Awaiting proof",
  provided: "Ready to review",
  explained: "Explained, no permit",
  verified: "Residence proven",
  rejected: "Rejected",
};

export interface ResidenceInput {
  documents?: CandidateDocument[];
  /** Set when a recruiter asks. Absent means nobody has. */
  residenceRequestedAt?: string;
  /** The country they are being asked to prove they live in. */
  residenceCountry?: string;
  /** What the candidate is told, in the email and on the upload card. */
  residenceReason?: string;
  /** Their words, when they have no permit. */
  residenceExplanation?: string;
  residenceExplainedAt?: string;
  residenceVerifiedAt?: string;
  residenceRejectedAt?: string;
  residenceRejectionReason?: string;
  /** When a recruiter last asked for it again, and why. */
  residenceReuploadRequestedAt?: string;
  residenceReuploadReason?: string;
  /** Photographs cleared by hand after a decision. The decision survives. */
  residenceImagesDeletedAt?: string;
}

/** Are both photographs present and not superseded? */
export function hasResidenceImages(documents?: CandidateDocument[]): boolean {
  return RESIDENCE_KINDS.every((kind) => !!currentDocument(documents, kind));
}

/** The newest residence photograph on file, as an ISO string. */
function newestResidenceUpload(documents?: CandidateDocument[]): string {
  let newest = "";
  for (const kind of RESIDENCE_KINDS) {
    const doc = currentDocument(documents, kind);
    if (doc?.uploadedAt && doc.uploadedAt > newest) newest = doc.uploadedAt;
  }
  return newest;
}

/**
 * Has a recruiter asked again for something that has not arrived since?
 *
 * Compared against the newest photograph rather than stored as a flag
 * somebody has to remember to clear — the same reasoning as the identity
 * re-request, and the same tie-breaking: a same-second upload is the one the
 * recruiter was looking at when they asked, not an answer to the asking.
 */
export function residenceReuploadPending(c: ResidenceInput): boolean {
  const asked = c.residenceReuploadRequestedAt;
  if (!asked) return false;
  const answered = newestResidenceUpload(c.documents);
  const explained = c.residenceExplainedAt ?? "";
  return !(answered > asked) && !(explained > asked);
}

/**
 * Where a candidate stands.
 *
 * Derived, never stored. A decision outranks everything, because a recruiter
 * who has verified a permit has said the question is closed and a later
 * photograph should not silently reopen it — asking again is an action with
 * its own button, which clears the decision.
 */
export function residenceStatus(c: ResidenceInput): ResidenceStatus {
  if (!c.residenceRequestedAt) return "not_asked";
  if (c.residenceVerifiedAt) return "verified";
  if (c.residenceRejectedAt) return "rejected";
  if (residenceReuploadPending(c)) return "awaiting";
  if (hasResidenceImages(c.documents)) return "provided";
  if (c.residenceExplainedAt) return "explained";
  return "awaiting";
}

/** Is this person being asked for something right now? */
export function residencePending(c: ResidenceInput): boolean {
  const status = residenceStatus(c);
  return status === "awaiting" || status === "provided" || status === "explained";
}

/**
 * Does the candidate still owe us photographs or an explanation?
 *
 * What the candidate-facing pages ask, as opposed to what the panel shows: a
 * recruiter still reviewing is not the candidate's problem, and showing them
 * an upload card after they have uploaded is how somebody sends the same
 * photographs three times.
 */
export function residenceOwed(c: ResidenceInput): boolean {
  return residenceStatus(c) === "awaiting";
}

/* -------------------------------------------------------------------------- */
/* Why they are being asked                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The wording the candidate sees.
 *
 * Written to explain rather than to accuse. The situation is usually
 * legitimate, the candidate has done nothing wrong, and a message that reads
 * as an accusation loses good people at the last step before an offer.
 */
export const RESIDENCE_REASONS = [
  {
    value: "nationality-differs",
    label: "Nationality and country of residence differ",
    message:
      "Your identity document was issued by a different country from the one you have told us you live in. That is perfectly normal, but your written agreement has to carry the address where you actually live, so we need one document that shows you are resident there.",
  },
  {
    value: "address-unproven",
    label: "Residence address not proven",
    message:
      "Before we prepare your written agreement we need to confirm the address it will be issued to. Your identity document proves who you are but not where you live, so we need a residence permit as well.",
  },
  {
    value: "id-no-address",
    label: "ID document shows no address",
    message:
      "The identity document you sent does not show an address, so it cannot confirm which country you live in. Your agreement has to carry that address, so we need a residence permit as well.",
  },
  {
    value: "address-mismatch",
    label: "Address does not match the application",
    message:
      "The country on your identity document does not match the address on your application, and your agreement has to carry the address where you actually live. Please send your residence permit so we can confirm which is correct.",
  },
] as const;

export type ResidenceReasonValue = (typeof RESIDENCE_REASONS)[number]["value"];

/** The wording for a preset, or the recruiter's own words, trimmed and capped. */
export function residenceMessage(value: string, custom?: string): string {
  const preset = RESIDENCE_REASONS.find((r) => r.value === value);
  if (preset) return preset.message;
  return (custom ?? "").trim().slice(0, 400);
}

/** The most anybody needs to explain why they are living somewhere. */
export const MAX_EXPLANATION = 1200;

/* -------------------------------------------------------------------------- */
/* The flag                                                                    */
/* -------------------------------------------------------------------------- */

export interface NationalityInput {
  confirmedDetails?: { nationality?: string; country?: string };
}

/**
 * Do the nationality and the country of residence disagree?
 *
 * Only answerable once they have accepted an offer, because the acceptance
 * form is the one place that asks both — the application asks only where they
 * live, and nothing reads a nationality off a photograph. Before that point a
 * recruiter looking at a passport is the only detector there is, which is why
 * the request button is always available rather than gated on this.
 *
 * A prompt, never a verdict. Dual nationals, expats, students and anyone on a
 * work visa produce this every day, and the whole point of asking for a permit
 * is that most of them can produce one.
 */
export function nationalityDiffersFromResidence(c: NationalityInput): boolean {
  const nationality = (c.confirmedDetails?.nationality ?? "").trim().toLowerCase();
  const residence = (c.confirmedDetails?.country ?? "").trim().toLowerCase();
  if (!nationality || !residence) return false;
  return nationality !== residence;
}

/**
 * Worth a recruiter's attention: the countries differ and nothing is on file.
 *
 * Stops flagging the moment somebody has been asked, whatever the answer was.
 * A chip that stayed lit after the question had been dealt with would be a
 * chip people learn to ignore.
 */
export function residenceUnproven(c: ResidenceInput & NationalityInput): boolean {
  return nationalityDiffersFromResidence(c) && residenceStatus(c) === "not_asked";
}

/* -------------------------------------------------------------------------- */
/* Filtering                                                                   */
/* -------------------------------------------------------------------------- */

export type ResidenceFilter = "all" | ResidenceStatus | "unproven";

export const RESIDENCE_FILTERS: { value: ResidenceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unproven", label: "Countries differ, not asked" },
  { value: "awaiting", label: "Awaiting proof" },
  { value: "provided", label: "Ready to review" },
  { value: "explained", label: "Explained, no permit" },
  { value: "verified", label: "Residence proven" },
  { value: "rejected", label: "Rejected" },
];

export function matchesResidenceFilter(
  filter: ResidenceFilter,
  c: ResidenceInput & NationalityInput,
): boolean {
  if (filter === "all") return true;
  if (filter === "unproven") return residenceUnproven(c);
  return residenceStatus(c) === filter;
}
