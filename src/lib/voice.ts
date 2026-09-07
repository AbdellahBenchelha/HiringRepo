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
