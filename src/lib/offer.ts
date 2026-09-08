/**
 * A written job offer.
 *
 * Pure module — no filesystem, no node built-ins — so the Admin Panel form and
 * the server that sends the email agree on one definition of what an offer is
 * and what makes one valid.
 *
 * The terms are stored alongside the candidate rather than rebuilt from the
 * job listing at read time. A listing's advertised pay changes; what you
 * actually offered someone on a particular day must not change with it.
 */
import { jobs, type Salary } from "@/config/jobs";
import { MAX_HOURS_PER_DAY, MAX_HOURS_PER_WEEK, REQUIRED_DAYS } from "@/lib/availability";

export const ENGAGEMENT_TYPES = ["Independent contractor", "Employee"] as const;
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number];

export interface Offer {
  position: string;
  /** Agreed rate. A single number, not a range — a range is an advert. */
  rate: number;
  currency: string;
  unit: Salary["unit"];
  hoursPerWeek?: number;
  /**
   * What the weekly hours were before the schedule cap brought them down.
   *
   * Set only on offers sent before the cap existed. The original figure is
   * kept because it is what the candidate's email says, and a record that
   * quietly matches the new number would make that email look like a forgery.
   */
  hoursCappedFrom?: number;
  /** ISO date. */
  startDate?: string;
  engagement: EngagementType;
  probation?: string;
  /** Anything specific agreed on the call. */
  note?: string;
}

/**
 * The offer as it stands today.
 *
 * A schedule of five days at five hours cannot deliver more than twenty-five
 * hours a week, so an older offer promising thirty is a promise nothing can
 * keep. Rather than editing history, every reader passes the offer through
 * here: the page, the Admin Panel and any email sent from now on all show the
 * same number, and the stored record keeps what was originally sent.
 */
export function effectiveOffer(offer: Offer): Offer {
  if (!offer.hoursPerWeek || offer.hoursPerWeek <= MAX_HOURS_PER_WEEK) return offer;
  return { ...offer, hoursPerWeek: MAX_HOURS_PER_WEEK, hoursCappedFrom: offer.hoursPerWeek };
}

/** What the candidate's own offer email said, when that is no longer the figure. */
export function cappedFrom(offer: Offer): number | null {
  const effective = effectiveOffer(offer);
  return effective.hoursCappedFrom ?? null;
}

export interface OfferState {
  offer?: Offer;
  offerSentAt?: string;
  offerAcceptedAt?: string;
  offerDeclinedAt?: string;
  offerDeclineReason?: string;
}

export type OfferStatus = "none" | "sent" | "accepted" | "declined";

export function offerStatus(c: OfferState): OfferStatus {
  if (c.offerAcceptedAt) return "accepted";
  if (c.offerDeclinedAt) return "declined";
  if (c.offerSentAt) return "sent";
  return "none";
}

export const OFFER_LABEL: Record<OfferStatus, string> = {
  none: "No offer",
  sent: "Offer sent",
  accepted: "Offer accepted",
  declined: "Offer declined",
};

/**
 * Whether the offer form belongs in front of this candidate yet.
 *
 * Opens as soon as their recording is in, not only once someone has ticked
 * "Passed". In practice the recruiter listens to the recording, calls them,
 * and decides — the "Passed" tick often happens afterwards or not at all, and
 * a form that waits for it is a form that is not there when it is needed.
 *
 * "Failed" is deliberately excluded: whatever else the flow allows, it should
 * not put an offer form in front of someone who was just turned down. Anyone
 * already sent an offer keeps it regardless, or the terms and the accept /
 * decline buttons would vanish the moment their status moved on.
 */
export function canOffer(voiceStatus: string | undefined, state: OfferState): boolean {
  if (state.offerSentAt) return true;
  return voiceStatus === "Voice Recording Received" || voiceStatus === "Voice Assessment Passed";
}

/** The advertised pay for a role, so the form can prefill and warn. */
export function advertisedFor(position: string): Salary | undefined {
  return jobs.find((j) => j.title === position)?.salary;
}

/**
 * Is the offered rate below what was advertised for the role?
 *
 * Worth saying out loud before the email goes: a candidate who came through
 * six stages on the strength of a published figure and is then offered less
 * is the complaint that gets a company reported, and it is easy to do by
 * accident when typing quickly.
 *
 * Compares against the bottom of the advertised band — offering the minimum is
 * fine, offering below it is not what was promised.
 */
export function belowAdvertised(offer: Offer): Salary | null {
  const advertised = advertisedFor(offer.position);
  if (!advertised) return null;
  if (advertised.currency !== offer.currency || advertised.unit !== offer.unit) return null;
  return offer.rate < advertised.min ? advertised : null;
}

/** Everything wrong with this offer, in the order a person would fix it. */
export function offerProblems(offer: Partial<Offer>): string[] {
  const problems: string[] = [];
  if (!offer.position?.trim()) problems.push("Position is required.");
  if (typeof offer.rate !== "number" || !Number.isFinite(offer.rate) || offer.rate <= 0) {
    problems.push("Enter the agreed rate.");
  }
  if (!offer.currency?.trim()) problems.push("Currency is required.");
  if (!offer.unit) problems.push("Choose how the rate is paid.");
  if (!offer.engagement || !ENGAGEMENT_TYPES.includes(offer.engagement)) {
    problems.push("Choose whether this is a contractor or an employee.");
  }
  if (
    offer.hoursPerWeek !== undefined &&
    (!Number.isFinite(offer.hoursPerWeek) || offer.hoursPerWeek <= 0 || offer.hoursPerWeek > 168)
  ) {
    problems.push("Hours per week does not look right.");
  }
  return problems;
}

/**
 * Warnings worth reading before the email goes, which are not refusals.
 *
 * Above twenty-five hours the schedule cannot deliver what the offer says:
 * five days at five hours is the shape everyone has agreed to, and the offer
 * page will show twenty-five whatever is typed here. Said out loud rather than
 * blocked — there may be a reason, and the person sending it knows more than
 * this function does.
 */
export function offerWarnings(offer: Partial<Offer>): string[] {
  const problems: string[] = [];
  if (offer.hoursPerWeek !== undefined && offer.hoursPerWeek > MAX_HOURS_PER_WEEK) {
    problems.push(
      `${offer.hoursPerWeek} hours a week is more than ${REQUIRED_DAYS} days × ` +
        `${MAX_HOURS_PER_DAY} hours. The offer page will show ${MAX_HOURS_PER_WEEK}.`,
    );
  }
  if (offer.startDate && Number.isNaN(Date.parse(offer.startDate))) {
    problems.push("Start date is not a valid date.");
  }
  return problems;
}

const UNIT_LABEL: Record<Salary["unit"], string> = {
  HOUR: "hour",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

/** "$22 per hour" — the figure as it appears in the offer email. */
export function formatRate(offer: Pick<Offer, "rate" | "currency" | "unit">): string {
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: offer.currency,
    maximumFractionDigits: 0,
  }).format(offer.rate);
  return `${money} per ${UNIT_LABEL[offer.unit]}`;
}
