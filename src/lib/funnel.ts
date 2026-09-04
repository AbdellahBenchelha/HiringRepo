/**
 * How far applicants got, in a period.
 *
 * Pure, and derived from the timestamps already on every candidate — no new
 * data is recorded to produce any of this.
 *
 * **Each stage counts the events that happened in the period, not a cohort.**
 * Someone who applied in July and was offered the job in September appears in
 * July's "applied" and September's "offer sent". That is the honest reading of
 * "what happened this month", and it is why the drop-offs are labelled as a
 * share of the period's applications rather than as a conversion rate: with a
 * hiring cycle of weeks, the people being offered a job this month are mostly
 * not the people who applied this month. A percentage that implied otherwise
 * would read as a collapse every time applications grew.
 *
 * Only stages with a real timestamp are here. The voice assessment records
 * when it was *requested* but not when it was passed, so the request is what
 * appears — a stage inferred from present state would silently mean something
 * different from every stage around it.
 */
import type { Candidate } from "@/lib/store";
import { verificationStatus, identityStillNeeded } from "@/lib/verification";
import { dayKey, type Range } from "@/lib/analytics";

export interface FunnelStage {
  label: string;
  count: number;
  /** Share of the first stage, for the bar width and the printed figure. */
  share: number;
  /** How many were lost since the previous stage. Null on the first. */
  dropped: number | null;
}

/** True when an ISO timestamp falls inside the range, judged in site time. */
function inRange(iso: string | undefined, range: Range): boolean {
  if (!iso) return false;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return false;
  const key = dayKey(at);
  return key >= range.from && key <= range.to;
}

/** How many candidates carry a timestamp for this stage inside the range. */
function count(list: readonly Candidate[], range: Range, at: (c: Candidate) => string | undefined) {
  return list.reduce((n, c) => n + (inRange(at(c), range) ? 1 : 0), 0);
}

export function buildFunnel(candidates: readonly Candidate[], range: Range): FunnelStage[] {
  const raw: { label: string; count: number }[] = [
    { label: "Started an application", count: count(candidates, range, (c) => c.createdAt) },
    { label: "Completed the form", count: count(candidates, range, (c) => c.submittedAt) },
    { label: "Assessment sent", count: count(candidates, range, (c) => c.interviewEmailSentAt) },
    { label: "Assessment completed", count: count(candidates, range, (c) => c.interview?.completedAt) },
    { label: "Voice assessment asked", count: count(candidates, range, (c) => c.voiceRequestedAt) },
    { label: "Offer sent", count: count(candidates, range, (c) => c.offerSentAt) },
    { label: "Offer accepted", count: count(candidates, range, (c) => c.offerAcceptedAt) },
  ];

  const first = raw[0].count;
  return raw.map((stage, i) => ({
    ...stage,
    share: first > 0 ? Math.round((stage.count / first) * 1000) / 10 : 0,
    dropped: i === 0 ? null : Math.max(0, raw[i - 1].count - stage.count),
  }));
}

/** The two application figures the headline tiles need. */
export function applicationCounts(candidates: readonly Candidate[], range: Range) {
  return {
    started: count(candidates, range, (c) => c.createdAt),
    submitted: count(candidates, range, (c) => c.submittedAt),
  };
}

/**
 * Work waiting for someone, right now.
 *
 * Deliberately not filtered by the period: a candidate whose identity check
 * has sat unreviewed since last month is more urgent than one from this
 * morning, not less, and a date filter would hide exactly the oldest ones.
 */
export function attentionCounts(
  candidates: readonly Candidate[],
  heldCountries: readonly string[],
  applies: (country: string, phone: string, list: readonly string[]) => boolean,
  /** Countries that must verify, so "ready to review" means what the ID tab means. */
  requiredCountries: readonly string[],
) {
  return {
    inviteHeld: candidates.filter(
      (c) => c.submittedAt && !c.interviewEmailSentAt && applies(c.country, c.phone, heldCountries),
    ).length,
    // The shared rule rather than a second guess at it: a dashboard that
    // counted "ready to review" differently from the tab it links to would
    // send you to a list that does not match the number you clicked.
    idToReview: candidates.filter((c) => verificationStatus(c, requiredCountries) === "provided")
      .length,
    offersWaiting: candidates.filter((c) => c.offerSentAt && !c.offerAcceptedAt && !c.offerDeclinedAt)
      .length,
    acceptedUnconfirmed: candidates.filter((c) => c.offerAcceptedAt && !c.confirmedDetails).length,
    // Accepted, but we still have no identity documents for them. An agreement
    // must not be drawn up for someone whose identity has never been checked,
    // so this is the queue that blocks a contract rather than merely delaying
    // one.
    acceptedNoIdentity: candidates.filter((c) => c.offerAcceptedAt && identityStillNeeded(c)).length,
  };
}
