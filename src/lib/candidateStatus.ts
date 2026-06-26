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
