/**
 * Emailing a group of candidates, one at a time, with a gap between each.
 *
 * Pure module — no filesystem, no node built-ins — so the selection bar, the
 * route that starts a batch and the worker that runs it agree on what can be
 * sent to whom.
 *
 * The gap is the point. Fifty identical messages leaving in the same second is
 * the shape of a blast, and it is also how a sending domain earns a
 * rate-limit. Worth being honest about the limits of it: pacing avoids
 * rate-based blocks and looks less like a machine, but where mail *lands* is
 * decided mostly by SPF, DKIM and DMARC alignment and by whether people open
 * it. This buys politeness, not deliverability.
 */
import { currentVoiceRecording, voiceRecordingNeeded } from "@/lib/voice";
import type { CandidateDocument } from "@/lib/documents";

export const BULK_ACTIONS = ["assessment", "reminder", "voice", "voiceReminder"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export const ACTION_LABEL: Record<BulkAction, string> = {
  assessment: "Send assessment link",
  reminder: "Send reminder",
  voice: "Send voice assessment",
  voiceReminder: "Send voice reminder",
};

/** Which buttons each tab offers, since the two lists hold different people. */
export const CANDIDATE_ACTIONS: readonly BulkAction[] = ["assessment", "reminder"];
export const INTERVIEW_ACTIONS: readonly BulkAction[] = ["voice", "voiceReminder"];

/** How long a batch may be. A misclick must not be able to email everybody. */
export const MAX_BATCH = 50;

export const PACE_OPTIONS = [
  { value: 60, label: "Careful", hint: "one email a minute" },
  { value: 45, label: "Normal", hint: "about 45 seconds apart" },
  { value: 15, label: "Quick", hint: "15 seconds apart" },
] as const;

export const DEFAULT_PACE_SECONDS = 45;

/** Wall-clock seconds either side of the pace, so the rhythm is not machine-perfect. */
export const JITTER_SECONDS = 7;

export function isPace(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 5 && value <= 600;
}

/** The next gap, in milliseconds. */
export function nextGapMs(paceSeconds: number): number {
  const jitter = (Math.random() * 2 - 1) * JITTER_SECONDS;
  return Math.max(3, paceSeconds + jitter) * 1000;
}

/** What the eligibility rules need to know about a candidate. */
export interface BulkCandidate {
  id: string;
  fullName?: string;
  email?: string;
  interviewCompleted?: boolean;
  interviewEmailSentAt?: string;
  /** For the voice actions: what has been asked for, and what has arrived. */
  voiceRequestedAt?: string;
  documents?: CandidateDocument[];
}

export type Eligibility =
  /** Will be sent. */
  | { include: true; warn?: string }
  /** Left out, with the reason a person would give. */
  | { include: false; reason: string };

/**
 * Should this candidate be in the batch?
 *
 * Two kinds of exclusion, and the difference matters. "No email address" and
 * "already finished" are facts that make the message wrong to send. "Already
 * invited" is not — resending an invitation to somebody who says it never
 * arrived is the commonest reason to be here at all — so it warns and goes.
 */
export function eligibility(action: BulkAction, c: BulkCandidate): Eligibility {
  if (!c.email || !c.email.includes("@")) {
    return { include: false, reason: "no email address" };
  }

  // The voice actions are about a different step, and they ask the opposite
  // question: these people have finished the assessment, and what matters is
  // whether a recording has been asked for and whether one has arrived.
  if (action === "voice" || action === "voiceReminder") {
    const recording = currentVoiceRecording(c.documents);
    if (action === "voice") {
      // Asking again for a fresh recording, after listening to one and not
      // being satisfied, is a judgement about one person. It is made in their
      // profile, not by ticking forty boxes — so a recording on file takes
      // them out of the batch rather than quietly replacing the request.
      if (recording) return { include: false, reason: "has already sent a recording" };
      return c.voiceRequestedAt
        ? { include: true, warn: "already asked — this asks again" }
        : { include: true };
    }
    if (!c.voiceRequestedAt) {
      return { include: false, reason: "has not been asked for a recording yet" };
    }
    if (!voiceRecordingNeeded(c)) {
      return { include: false, reason: "has already sent their recording" };
    }
    return { include: true };
  }

  if (c.interviewCompleted) {
    return {
      include: false,
      reason:
        action === "assessment"
          ? "has already completed the assessment"
          : "has already completed the assessment",
    };
  }
  if (action === "assessment" && c.interviewEmailSentAt) {
    return { include: true, warn: "already invited — this sends it again" };
  }
  return { include: true };
}

export interface BatchItem {
  id: string;
  name: string;
  email: string;
  state: "pending" | "sent" | "failed" | "skipped";
  /** Why it failed or was skipped, in the words the server used. */
  reason?: string;
  at?: string;
}

export interface BatchState {
  id: string;
  action: BulkAction;
  paceSeconds: number;
  createdAt: string;
  startedBy?: string;
  status: "running" | "paused" | "done" | "cancelled";
  items: BatchItem[];
  /** When the worker intends to send the next one. */
  nextAt?: string;
  finishedAt?: string;
}

export function counts(batch: BatchState) {
  const by = (s: BatchItem["state"]) => batch.items.filter((i) => i.state === s).length;
  return {
    total: batch.items.length,
    sent: by("sent"),
    failed: by("failed"),
    skipped: by("skipped"),
    pending: by("pending"),
  };
}

export function isFinished(batch: BatchState): boolean {
  return batch.status === "done" || batch.status === "cancelled";
}
