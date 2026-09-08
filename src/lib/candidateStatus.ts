/** Candidate statuses — shared by server (store) and client (admin UI). */
export const CANDIDATE_STATUSES = [
  "New Application",
  "Interview Invitation Sent",
  "Interview Pending",
  "Interview Completed",
  "Under Review",
  "Accepted",
  // "Accepted" is a decision we made; these two are what happened next.
  "Offer Sent",
  "Hired",
  "Rejected",
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

/** Voice-assessment statuses (manually updated by the admin). */
export const VOICE_STATUSES = [
  "Voice Assessment Not Requested",
  "Voice Assessment Requested",
  "Voice Recording Received",
  "Voice Assessment Passed",
  "Voice Assessment Failed",
] as const;

export type VoiceStatus = (typeof VOICE_STATUSES)[number];

/**
 * Statuses that mean the interview stage is behind this candidate.
 *
 * The Interviews tab used to list exactly the people with a set of recorded
 * answers, which left out anybody interviewed away from the site — a call
 * taken on the phone, an assessment sat before this system existed — even
 * after somebody marked them Interview Completed by hand. Marking a status is
 * a statement about the candidate, and the tab that acts on that stage should
 * believe it.
 *
 * The later stages are here too, so a candidate added this way does not vanish
 * from the tab the moment an offer is sent to them from it. "Rejected" is not:
 * it says how things ended, not how far they got.
 */
const PAST_INTERVIEW: readonly CandidateStatus[] = [
  "Interview Completed",
  "Under Review",
  "Accepted",
  "Offer Sent",
  "Hired",
];

export function reachedInterviewStage(status?: string): boolean {
  return !!status && PAST_INTERVIEW.includes(status as CandidateStatus);
}
