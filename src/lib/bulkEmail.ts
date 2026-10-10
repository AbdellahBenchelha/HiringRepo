/**
 * Emailing a group of candidates, one at a time, with a gap between each.
 *
 * Pure module — no filesystem, no node built-ins — so the selection bar, the
 * route that starts a batch and the worker that runs it agree on what can be
 * sent to whom.
 *
 * The gap is the point. A hundred identical messages leaving in the same second is
 * the shape of a blast, and it is also how a sending domain earns a
 * rate-limit. Worth being honest about the limits of it: pacing avoids
 * rate-based blocks and looks less like a machine, but where mail *lands* is
 * decided mostly by SPF, DKIM and DMARC alignment and by whether people open
 * it. This buys politeness, not deliverability.
 */
import { currentVoiceRecording, voiceRecordingNeeded } from "@/lib/voice";
import { ackRefusal } from "@/lib/voiceAck";
import { VOICE_SKIPPED } from "@/lib/candidateStatus";
import { VERIFIED_ACK_REFUSAL, verifiedAckRefusal } from "@/lib/verifiedAck";
import { canOffer, type Offer } from "@/lib/offer";
import type { CandidateDocument } from "@/lib/documents";
import { addressProofStatus } from "@/lib/addressProof";

export const BULK_ACTIONS = [
  "assessment", "reminder", "voice", "voiceReminder", "voiceAck", "offerReminder", "offer", "chatReminder", "verifiedAck",
  "addressProof",
] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number];

export const ACTION_LABEL: Record<BulkAction, string> = {
  assessment: "Send assessment link",
  reminder: "Send reminder",
  voice: "Send voice assessment",
  voiceReminder: "Send voice reminder",
  voiceAck: "Tell them we have it",
  offerReminder: "Remind to answer",
  offer: "Send offers",
  chatReminder: "Remind to start chat",
  verifiedAck: "Tell them they’re verified",
  addressProof: "Ask for proof of address",
};

/** Which buttons each tab offers, since the two lists hold different people. */
export const CANDIDATE_ACTIONS: readonly BulkAction[] = ["assessment", "reminder"];
export const INTERVIEW_ACTIONS: readonly BulkAction[] = ["voice", "voiceReminder", "voiceAck", "verifiedAck"];
export const OFFER_ACTIONS: readonly BulkAction[] = ["offerReminder"];
/**
 * Favorites cut across every stage, but they are starred to be hired: the tab
 * only offers the offer reminder here, with the offer editor beside it.
 */
export const FAVORITE_ACTIONS: readonly BulkAction[] = ["offerReminder"];
/**
 * Accepted: chasing the final interview chat for those who never started it,
 * and asking for proof of address (the optional last step).
 */
export const ACCEPTED_ACTIONS: readonly BulkAction[] = ["chatReminder", "addressProof"];

/** Below this, a chat reminder sent again warns: two in a day read as spam. */
const CHAT_REMINDER_WARN_MS = 24 * 60 * 60 * 1000;

/** How long a batch may be. A misclick must not be able to email everybody. */
export const MAX_BATCH = 100;

/**
 * How long a batch will take, in words.
 *
 * A hundred at a minute apart is the best part of two hours, and "about 100
 * minutes" is a number nobody converts in their head — so past the hour it is
 * said in hours. Shared by the selection bar and the offer editor, because a
 * figure that two screens computed separately is a figure they would one day
 * disagree about.
 */
export function batchDuration(count: number, paceSeconds: number): string {
  const minutes = Math.max(1, Math.round((count * paceSeconds) / 60));
  const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${plural(hours, "hour")} ${plural(rest, "minute")}` : plural(hours, "hour");
}

/**
 * Slowest first, so the list reads as a ramp and the safe end is the one you
 * land on. The jitter below moves each gap a few seconds either way, which is
 * why every hint says "about".
 */
export const PACE_OPTIONS = [
  { value: 60, label: "Careful", hint: "one email a minute" },
  { value: 45, label: "Normal", hint: "about 45 seconds apart" },
  { value: 35, label: "Brisk", hint: "about 35 seconds apart" },
  { value: 25, label: "Quick", hint: "about 25 seconds apart" },
  { value: 15, label: "Fastest", hint: "about 15 seconds apart" },
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
  /** For the acknowledgement: what would make it untrue to send. */
  voiceStatus?: string;
  voiceAckSentAt?: string;
  /** For the offer chase: whether one is out, and whether it was answered. */
  offerSentAt?: string;
  /** For a new offer: whether they are far enough along to have one. */
  voiceStatusForOffer?: string;
  offerAcceptedAt?: string;
  offerDeclinedAt?: string;
  offerReminderCount?: number;
  /** For the chat reminder: a link out, whether its chat started, the last reminder. */
  chatLinkSentAt?: string;
  chatStarted?: boolean;
  chatRemindedAt?: string;
  /** For "your information is verified": ID verified, status, and whether it went before. */
  verifiedAt?: string;
  status?: string;
  verifiedAckSentAt?: string;
  /** For the proof-of-address request: what was asked, and what came back. */
  addressProofRequestedAt?: string;
  addressProofSubmittedAt?: string;
  addressProofApprovedAt?: string;
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

  // "Your information is verified — we will be in touch about a place."
  // Refused wherever it would be wrong; see lib/verifiedAck.
  if (action === "verifiedAck") {
    const refusal = verifiedAckRefusal({
      documents: c.documents,
      verifiedAt: c.verifiedAt,
      offerSentAt: c.offerSentAt,
      status: c.status,
      voiceStatus: c.voiceStatus,
    });
    if (refusal) return { include: false, reason: VERIFIED_ACK_REFUSAL[refusal] ?? refusal };
    return c.verifiedAckSentAt ? { include: true, warn: "already told — this tells them again" } : { include: true };
  }

  // "Your agreement is ready — please confirm your address." Only after
  // acceptance, and never to somebody whose document is already in: a new
  // document is asked for one person at a time, with the reason, in View info.
  if (action === "addressProof") {
    if (!c.offerAcceptedAt) return { include: false, reason: "has not accepted an offer" };
    const status = addressProofStatus(c);
    if (status === "received") return { include: false, reason: "has already sent their proof of address" };
    if (status === "approved") return { include: false, reason: "proof of address already approved" };
    return status === "asked" ? { include: true, warn: "already asked — this asks again" } : { include: true };
  }

  // "You haven't started your final interview chat yet." Refused for anybody
  // it would be untrue for: never sent the link, or already in the chat.
  if (action === "chatReminder") {
    if (!c.chatLinkSentAt) return { include: false, reason: "has not been sent a chat link" };
    if (c.chatStarted) return { include: false, reason: "has already started the chat" };
    const last = c.chatRemindedAt ? Date.parse(c.chatRemindedAt) : NaN;
    return Date.now() - last < CHAT_REMINDER_WARN_MS
      ? { include: true, warn: "already reminded in the last 24 hours — this sends another" }
      : { include: true };
  }

  // A written offer, with its own terms per person. Refused for anybody who
  // already has one: replacing terms somebody is holding in their inbox is a
  // decision about one person, made in their profile with the revised-offer
  // form, not by ticking a box in a list.
  if (action === "offer") {
    if (c.offerSentAt) return { include: false, reason: "already has an offer" };
    if (!canOffer(c.voiceStatusForOffer, { offerSentAt: c.offerSentAt })) {
      return { include: false, reason: "has not sent a voice recording yet" };
    }
    return { include: true };
  }

  // Chasing an answer to an offer. Refused for anybody who has answered:
  // telling somebody who accepted on Tuesday that we are about to close their
  // file is the one mistake this could make, and it must be impossible.
  if (action === "offerReminder") {
    if (!c.offerSentAt) return { include: false, reason: "has not been sent an offer" };
    if (c.offerAcceptedAt) return { include: false, reason: "has already accepted" };
    if (c.offerDeclinedAt) return { include: false, reason: "has already declined" };
    return (c.offerReminderCount ?? 0) > 0
      ? { include: true, warn: "already reminded — this sends another and moves their deadline" }
      : { include: true };
  }

  // The receipt for a recording. Refused wherever it would be untrue, and the
  // reasons are the same ones the single-candidate route gives.
  if (action === "voiceAck") {
    const refusal = ackRefusal(c);
    if (refusal) {
      return {
        include: false,
        reason:
          refusal === "no_recording"
            ? "has not sent a recording"
            : refusal === "already_offered"
              ? "already has an offer — this would be behind the news"
              : "has been marked as failing the assessment",
      };
    }
    return c.voiceAckSentAt
      ? { include: true, warn: "already told — this tells them again" }
      : { include: true };
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
    if (c.voiceStatus === VOICE_SKIPPED) {
      return { include: false, reason: "told they are verified — waiting for the final video interview" };
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
  /**
   * This person's own terms, for an offer batch.
   *
   * The one action where the message differs per candidate: everything else
   * here sends the same words to everybody. Carried on the item rather than on
   * the batch so that a queue resumed after a restart still knows what each
   * person was promised.
   */
  offer?: Offer;
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
  /**
   * The operator was shown the warm-up warning and chose to send anyway.
   *
   * Decided once, when the batch is started, rather than per message: a
   * question answered by a person at the point of starting is a decision, and
   * the same question answered by a worker ninety times is a loophole.
   */
  override?: boolean;
  /**
   * Waiting for tomorrow's allowance, as an instant.
   *
   * The batch is still "running" — it has not failed and nothing needs doing.
   * A batch of fifty at a minute apart runs for the best part of an hour and
   * can quite normally outlast the day's remaining cap, so this is an expected
   * state rather than an error, and the queue picks itself up when the day
   * rolls over in London.
   */
  heldUntil?: string;
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
