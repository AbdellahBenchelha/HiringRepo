/**
 * The spoken assessment — the shared model.
 *
 * Pure module: no filesystem, no node built-ins, so the candidate's page, the
 * upload routes, the email and the Admin Panel all agree on what has been
 * asked for and what has arrived from one definition.
 *
 * Recordings used to arrive on WhatsApp, which meant a recruiter matching a
 * voice note to a name by hand and setting the status by hand afterwards. They
 * now land on the candidate's own record, so both of those stop being jobs
 * anybody does.
 */
import { currentDocument, type CandidateDocument } from "@/lib/documents";
import type { VoiceStatus } from "@/lib/candidateStatus";

/**
 * The script read aloud for the voice assessment, exactly as it was when this
 * lived in the editable WhatsApp message — carried over rather than reworded,
 * since the wording itself was never the part anyone asked to change.
 *
 * Shown on the recording page as well as in the email. Reading it off a page
 * they have to switch away from to press record is how people lose their place.
 */
export function voiceScript(fullName: string): string {
  return (
    `"Hello, my name is ${fullName}. I am interested in joining your customer-support team. ` +
    `I enjoy communicating with customers, listening carefully to their concerns, and helping ` +
    `them find the best possible solution. I understand that professional customer service ` +
    `requires patience, respect, clear communication, and a positive attitude. I am comfortable ` +
    `working as part of a team, following company procedures, and learning new skills. I am ` +
    `motivated to provide customers with a helpful and professional experience."`
  );
}

export interface VoiceInput {
  documents?: CandidateDocument[];
  /** When a recruiter last asked for a recording. Absent = never asked. */
  voiceRequestedAt?: string;
}

/** The recording under review, or null. Superseded ones are history. */
export function currentVoiceRecording(
  documents?: CandidateDocument[],
): CandidateDocument | null {
  const doc = currentDocument(documents, "voice");
  return doc && doc.status !== "blocked" && doc.key ? doc : null;
}

/**
 * Does this candidate still owe us a recording?
 *
 * The request time against the newest recording on file, rather than a status
 * anyone has to remember to change. A recruiter who listens, is not satisfied
 * and asks again refreshes `voiceRequestedAt` — which reopens the step without
 * deleting what they sent, and closes it again the moment something newer
 * arrives. Asking a candidate twice for something they have already sent is
 * the failure worth designing out.
 *
 * Ties count as still owing: same-second timestamps mean the request and the
 * upload crossed, and in that case the recording is what the recruiter was
 * listening to when they asked, not an answer to the asking.
 */
export function voiceRecordingNeeded(c: VoiceInput): boolean {
  const asked = c.voiceRequestedAt;
  if (!asked) return false;
  const newest = (c.documents ?? [])
    .filter((d) => d.kind === "voice" && !!d.key)
    .map((d) => d.uploadedAt)
    .sort()
    .at(-1);
  return !newest || newest <= asked;
}

/**
 * Filtering a table by where somebody is with their voice assessment.
 *
 * The five statuses, plus a split of the one that has work attached to it.
 * "Requested" covers two different jobs: a recording that has been asked for
 * and never chased, and one that has been chased already. The first is an
 * email to send; the second is a decision about whether to keep chasing — and
 * they are indistinguishable in a list until they are asked for separately.
 *
 * The split is defined by voiceRecordingNeeded rather than by the status
 * label, so the rows it returns are exactly the ones the reminder button will
 * act on. A filter that offers somebody the button cannot refuse is worse than
 * no filter, and a recruiter's first move after narrowing to these is to tick
 * the lot and press it.
 */
export type VoiceFilter = "all" | VoiceStatus | "requested_unreminded" | "requested_reminded";

/**
 * The options, in the order somebody works through them. The two refinements
 * sit under "Requested" rather than at the end, because that is the row they
 * describe.
 */
export const VOICE_FILTERS: { value: VoiceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Voice Assessment Not Requested", label: "Not requested" },
  { value: "Voice Assessment Requested", label: "Requested" },
  { value: "requested_unreminded", label: "Requested — never reminded" },
  { value: "requested_reminded", label: "Requested — already reminded" },
  { value: "Voice Recording Received", label: "Recording received" },
  { value: "Voice Assessment Passed", label: "Passed" },
  { value: "Voice Assessment Failed", label: "Failed" },
];

export interface VoiceFilterInput {
  voiceStatus?: string;
  /** Asked for, and nothing newer has arrived. */
  voiceNeeded?: boolean;
  voiceReminderCount?: number;
}

export function matchesVoiceFilter(filter: VoiceFilter, c: VoiceFilterInput): boolean {
  if (filter === "all") return true;
  const reminded = (c.voiceReminderCount ?? 0) > 0;
  if (filter === "requested_unreminded") return !!c.voiceNeeded && !reminded;
  if (filter === "requested_reminded") return !!c.voiceNeeded && reminded;
  return (c.voiceStatus ?? "Voice Assessment Not Requested") === filter;
}
