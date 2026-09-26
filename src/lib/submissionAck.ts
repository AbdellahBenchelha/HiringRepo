/**
 * When "we have received your information, it is under review" is true.
 *
 * Pure, shared by the button and the route, so the panel never offers an email
 * the server would refuse and the server never sends one the panel would not
 * have offered.
 *
 * The email says two things — we have it, and it is under review — and both
 * have to be true when it goes. So: something they sent is on file and
 * nobody has decided on it yet. That is identity photographs marked ready to
 * review, or a residence permit or written explanation awaiting a decision.
 *
 * Not before anything has arrived, because thanking somebody for documents
 * they never sent reads as a mix-up at best and a phishing template at worst.
 * And not once a decision is made, because "under review, 1–3 business days"
 * sent to somebody already verified or rejected is simply wrong.
 */
import type { VerificationStatus } from "@/lib/verification";
import { residenceStatus, type ResidenceInput } from "@/lib/residence";

export function submissionAwaitingReview(
  verification: VerificationStatus,
  residence: ResidenceInput,
): boolean {
  if (verification === "provided") return true;
  const r = residenceStatus(residence);
  return r === "provided" || r === "explained";
}
