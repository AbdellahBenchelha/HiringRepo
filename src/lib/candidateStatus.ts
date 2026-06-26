/** Candidate statuses — shared by server (store) and client (admin UI). */
export const CANDIDATE_STATUSES = [
  "New Application",
  "Interview Invitation Sent",
  "Interview Pending",
  "Interview Completed",
  "Under Review",
  "Accepted",
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
