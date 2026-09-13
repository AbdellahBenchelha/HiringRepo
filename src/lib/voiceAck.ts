/**
 * Telling somebody their recording arrived, and that a decision is coming.
 *
 * The gap this closes is the worst silence in the process. A candidate records
 * the assessment, sends it, and then hears nothing while their file is read —
 * from their side that is indistinguishable from being turned down without
 * being told, and the good ones take the next offer they get.
 *
 * So the message is a receipt with a promise of a reply, and deliberately not
 * a promise of a job: places open as clients take on more support, and a
 * strong application sometimes waits for one. Saying that plainly is kinder
 * than implying an offer and going quiet.
 *
 * Pure module — no filesystem, no node built-ins — so the route, the bulk
 * queue, the profile button and the Waiting tab all decide from one place.
 */
import { currentVoiceRecording } from "@/lib/voice";
import type { CandidateDocument } from "@/lib/documents";

export interface VoiceAckState {
  documents?: CandidateDocument[];
  voiceStatus?: string;
  voiceAckSentAt?: string;
  voiceAckCount?: number;
  /** Every acknowledgement, oldest first. */
  voiceAcks?: string[];
  offerSentAt?: string;
  status?: string;
}

/** Why this cannot be sent, in the word the API answers with, or nothing. */
export function ackRefusal(c: VoiceAckState): string | undefined {
  if (!currentVoiceRecording(c.documents)) return "no_recording";
  // Behind the news: they already know more than this email would tell them.
  if (c.offerSentAt) return "already_offered";
  // "We will be in touch about a place" to somebody already judged unsuitable
  // is not a holding message, it is a false one. That needs a decline instead.
  if (c.voiceStatus === "Voice Assessment Failed") return "assessment_failed";
  return undefined;
}

export function canAcknowledge(c: VoiceAckState): boolean {
  return !ackRefusal(c);
}

/**
 * Waiting on us for a decision.
 *
 * They were told we would come back to them, and we have not: no offer has
 * gone out and nobody has turned them down. This is the whole Waiting tab, and
 * it is deliberately the candidate's point of view — somebody marked as having
 * failed their assessment is still waiting to be told so.
 */
export function awaitingDecision(c: VoiceAckState): boolean {
  return !!c.voiceAckSentAt && !c.offerSentAt && c.status !== "Rejected";
}

/** Whole days since we told them we would be in touch. */
export function daysWaiting(c: VoiceAckState, now: number = Date.now()): number {
  if (!c.voiceAckSentAt) return 0;
  const at = Date.parse(c.voiceAckSentAt);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.floor((now - at) / (24 * 60 * 60 * 1000)));
}

/**
 * How long is too long to leave somebody on this tab.
 *
 * Not a rule the system enforces — nothing is sent or changed when it passes.
 * It only decides which rows are shown in red, because a queue that looks the
 * same on day two and day twenty is a queue nobody works.
 */
export const WAITING_TOO_LONG_DAYS = 14;
