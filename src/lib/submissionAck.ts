/**
 * When the "we have received your information, it is under review" email can
 * be sent, and when it needs a second look first.
 *
 * Pure, shared by the button and the route, so the panel never offers an email
 * the server would refuse and the server never sends one the panel would not
 * have offered.
 *
 * The clean case is something they sent sitting on file with nobody having
 * decided on it: identity photographs marked ready to review, or a residence
 * permit or written explanation awaiting a decision.
 *
 * It can also go while the ID check reads "Awaiting upload" or "Verified",
 * because the recruiter may know more than the badge does — details confirmed
 * on the offer page, documents sent some other way, other information still
 * being checked after the ID passed. Those are sent with a warning in the
 * confirm step rather than refused, since the email then says something the
 * record does not back up and a slip of the hand should be caught.
 *
 * Never for a rejected or not-required check with nothing else open: there is
 * nothing under review to tell them about.
 */
import type { VerificationStatus } from "@/lib/verification";
import { residenceStatus, type ResidenceInput } from "@/lib/residence";

/** Something they sent is on file and waiting for a decision. */
export function submissionAwaitingReview(
  verification: VerificationStatus,
  residence: ResidenceInput,
): boolean {
  if (verification === "provided") return true;
  const r = residenceStatus(residence);
  return r === "provided" || r === "explained";
}

/** Can the email be sent at all — with or without a warning? */
export function submissionAckAllowed(
  verification: VerificationStatus,
  residence: ResidenceInput,
): boolean {
  return (
    submissionAwaitingReview(verification, residence) ||
    verification === "awaiting" ||
    verification === "verified"
  );
}

/**
 * What to say in the confirm step when the record does not show anything
 * waiting for review. Empty when it does.
 */
export function submissionAckCaution(
  verification: VerificationStatus,
  residence: ResidenceInput,
): string {
  if (submissionAwaitingReview(verification, residence)) return "";
  if (verification === "awaiting") {
    return "Their ID check shows Awaiting upload — no identity photos have arrived yet, and this email tells them we have received their information.";
  }
  if (verification === "verified") {
    return "Their ID is already verified, and this email tells them their information is still under review.";
  }
  return "";
}
