/**
 * "Your information is verified — we will be in touch about a place."
 *
 * For candidates whose identity is verified and who have not sent the voice
 * assessment — some prefer to wait for the final video interview. The email
 * tells them their application is complete and that we will contact them when
 * a place is available; it does not mention the recording. Sending it marks
 * their voice step "Voice Skipped — Final Video Interview" (no more voice
 * reminders, and an offer can follow without a recording), moves them to
 * Under Review, and puts them on the Waiting tab.
 *
 * Pure module, so the route, the bulk queue, the profile button and the
 * Waiting tab all decide from one place.
 */
import { currentVoiceRecording } from "@/lib/voice";
import type { CandidateDocument } from "@/lib/documents";

export interface VerifiedAckState {
  documents?: CandidateDocument[];
  verifiedAt?: string;
  offerSentAt?: string;
  status?: string;
  voiceStatus?: string;
  verifiedAckSentAt?: string;
  verifiedAcks?: string[];
}

/** Why this cannot be sent, in the word the API answers with, or nothing. */
export function verifiedAckRefusal(c: VerifiedAckState): string | undefined {
  if (!c.verifiedAt) return "not_verified";
  // They did send one: "Tell them we have it" is the email for them.
  if (currentVoiceRecording(c.documents)) return "has_recording";
  if (c.offerSentAt) return "already_offered";
  if (c.status === "Rejected") return "rejected";
  if (c.voiceStatus === "Voice Assessment Failed") return "assessment_failed";
  return undefined;
}

export function canSendVerifiedAck(c: VerifiedAckState): boolean {
  return !verifiedAckRefusal(c);
}

/** The refusal in words a recruiter reads, for the bulk plan and the button. */
export const VERIFIED_ACK_REFUSAL: Record<string, string> = {
  not_verified: "ID is not verified yet",
  has_recording: "sent a voice recording — use “Tell them we have it”",
  already_offered: "already has an offer",
  rejected: "is marked Rejected",
  assessment_failed: "has been marked as failing the assessment",
};
