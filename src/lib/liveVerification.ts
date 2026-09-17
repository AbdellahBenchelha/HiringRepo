/**
 * The live identity check, run by whichever provider the recruiter is using.
 *
 * When the photographs a candidate sent cannot settle the question — a blurred
 * document, a face that could be anyone, a card that looks retouched — the
 * recruiter creates a session for that one person with their provider and
 * pastes its link here. The provider then does what photographs by email
 * cannot: it watches the document and the face at the same moment, on a device
 * it can measure.
 *
 * Pure module — no filesystem, no node built-ins — so the admin form and the
 * route that sends the email agree on what a usable link is.
 */

/**
 * Providers whose domains are recognised on sight.
 *
 * Not an allowlist. The list decides whether the dialog says "Onfido link" or
 * "we do not recognise this domain" — a sanity check on a URL pasted between
 * two browser tabs, not a rule about who may be used. New providers appear,
 * accounts get custom domains, and a hiring team blocked from sending a
 * perfectly good link because this file has not heard of Veriff is a worse
 * outcome than an unrecognised domain going out with a warning attached.
 */
const KNOWN_PROVIDERS: { host: string; name: string }[] = [
  { host: "withpersona.com", name: "Persona" },
  { host: "onfido.com", name: "Onfido" },
  { host: "onfido.app", name: "Onfido" },
  { host: "veriff.com", name: "Veriff" },
  { host: "veriff.me", name: "Veriff" },
  { host: "sumsub.com", name: "Sumsub" },
  { host: "jumio.com", name: "Jumio" },
  { host: "netverify.com", name: "Jumio" },
  { host: "idenfy.com", name: "iDenfy" },
  { host: "shuftipro.com", name: "Shufti Pro" },
  { host: "yoti.com", name: "Yoti" },
  { host: "trulioo.com", name: "Trulioo" },
  { host: "didit.me", name: "Didit" },
  { host: "ondato.com", name: "Ondato" },
  { host: "hyperverge.co", name: "HyperVerge" },
  { host: "verify.stripe.com", name: "Stripe Identity" },
  { host: "complycube.com", name: "ComplyCube" },
];

export const MAX_LINK_LENGTH = 600;

/** The provider behind a link, when the domain is one we know. */
export function providerFor(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const hit = KNOWN_PROVIDERS.find((p) => host === p.host || host.endsWith(`.${p.host}`));
  return hit?.name ?? null;
}

export type LinkCheck =
  | { ok: true; url: string; provider: string | null }
  | { ok: false; problem: string };

/**
 * Is this a link we can send to a candidate?
 *
 * Deliberately permissive about *where* it points and strict about *how*. The
 * recruiter chooses the provider; the one thing not left to a typo is the
 * scheme, because this link asks somebody to photograph their passport and
 * carries a session identifier, and over plain http both are readable by
 * anyone between them and the provider. No real provider serves that flow over
 * http either, so refusing it never blocks a genuine link.
 *
 * Returns the URL as the parser normalised it, so what is stored and what was
 * checked are the same text.
 */
export function checkVerificationLink(input: string): LinkCheck {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, problem: "Paste the verification link for this candidate." };
  if (raw.length > MAX_LINK_LENGTH) {
    return { ok: false, problem: "That link is too long to be a verification link." };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      problem: "That is not a valid link. Paste the whole URL, starting https://",
    };
  }

  if (url.protocol !== "https:") {
    return {
      ok: false,
      problem: "The link must start with https:// — an identity check must not run over http.",
    };
  }
  if (!url.hostname.includes(".")) {
    return { ok: false, problem: "That link has no domain in it. Check you copied the whole URL." };
  }

  return { ok: true, url: url.toString(), provider: providerFor(url.toString()) };
}

export interface LiveVerificationState {
  liveVerificationUrl?: string;
  liveVerificationSentAt?: string;
  liveVerificationCount?: number;
  liveVerificationOpenedAt?: string;
  liveVerificationLastOpenedAt?: string;
  liveVerificationOpenCount?: number;
  /** When they pressed through to the provider, which is not the same as opening. */
  liveVerificationStartedAt?: string;
  /** Times the session behind their link was swapped, without emailing again. */
  liveVerificationLinkChangedAt?: string;
  liveVerificationLinkChangeCount?: number;
  /**
   * Set while the provider session behind their link is dead.
   *
   * A decision about the link, not about the candidate. It means "if this
   * person turns up, park them" — it does not mean anybody has turned up, and
   * most of the time it is ticked before they ever open the email.
   */
  liveVerificationHeldAt?: string;
  /**
   * When the candidate actually reached the waiting page.
   *
   * Separate from the field above because they answer different questions, and
   * conflating them is how the panel came to report somebody as waiting eight
   * minutes who had never opened their email. Written the first time they are
   * seen on that page and cleared when they are let out of it, so the elapsed
   * time survives a reload — which counting from their last open would not,
   * opens being throttled to a longer interval than the wait itself.
   */
  liveVerificationWaitingSince?: string;
  /** Which of the two stories their email told. See LIVE_REASONS. */
  liveVerificationReason?: string;
}

/**
 * The live-check fields of a candidate, as one object.
 *
 * Written once here rather than listed by hand at each call site. Spelling the
 * fields out in a component is how a new one gets added to the model, used by
 * the panel, and then silently never arrives — the panel reads its own copy,
 * and the copy was built by somebody enumerating the fields that existed that
 * day. Picking them from the record means adding a field is enough.
 */
export function liveStateOf(c: LiveVerificationState): LiveVerificationState {
  return {
    liveVerificationUrl: c.liveVerificationUrl,
    liveVerificationSentAt: c.liveVerificationSentAt,
    liveVerificationCount: c.liveVerificationCount,
    liveVerificationOpenedAt: c.liveVerificationOpenedAt,
    liveVerificationLastOpenedAt: c.liveVerificationLastOpenedAt,
    liveVerificationOpenCount: c.liveVerificationOpenCount,
    liveVerificationStartedAt: c.liveVerificationStartedAt,
    liveVerificationLinkChangedAt: c.liveVerificationLinkChangedAt,
    liveVerificationLinkChangeCount: c.liveVerificationLinkChangeCount,
    liveVerificationHeldAt: c.liveVerificationHeldAt,
    liveVerificationWaitingSince: c.liveVerificationWaitingSince,
    liveVerificationReason: c.liveVerificationReason,
  };
}

/**
 * How long somebody may reasonably be left on the waiting page.
 *
 * Not a rule anything enforces — nothing is sent and nothing changes when it
 * passes. It decides two things: what the candidate is told, because "one to
 * three minutes" stops being true and continuing to say it is a lie they can
 * measure; and whether the Admin Panel says in red that this person now needs
 * an email, because a page nobody is coming back to is worse than no page.
 */
export const HOLD_TOO_LONG_MINUTES = 5;

/** Is the session behind their link marked dead? Says nothing about them. */
export function isHeld(c: LiveVerificationState): boolean {
  return !!c.liveVerificationHeldAt;
}

/**
 * Whole minutes this candidate has spent on the waiting page, or null when
 * they are not on it.
 *
 * Null covers the ordinary case as well as the impossible one: a link marked
 * dead before the candidate ever opened their email has nobody waiting on it,
 * and there is no number to report. Saying "0 minutes" there would read as
 * somebody who has just arrived.
 */
export function waitingFor(c: LiveVerificationState, now: number = Date.now()): number | null {
  if (!c.liveVerificationWaitingSince) return null;
  const at = Date.parse(c.liveVerificationWaitingSince);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / 60_000));
}

/**
 * Somebody is on the waiting page and has been there too long.
 *
 * Both halves matter. Held alone is routine — it is how a recruiter marks a
 * dead session before the candidate arrives — and nothing is owed to anybody
 * until a real person is actually looking at the page.
 */
export function holdOverdue(c: LiveVerificationState, now: number = Date.now()): boolean {
  const minutes = waitingFor(c, now);
  return minutes !== null && minutes >= HOLD_TOO_LONG_MINUTES;
}

/**
 * One line for the panel: where this candidate has got to.
 *
 * "Sent" and "opened" and "started" are three different problems. Somebody who
 * never opened it may not have received it at all; somebody who opened it and
 * stopped is hesitating and can be talked to; somebody who started and did not
 * finish has an answer waiting in the provider's dashboard.
 */
export function liveVerificationStage(
  c: LiveVerificationState,
): "none" | "sent" | "opened" | "started" {
  if (c.liveVerificationStartedAt) return "started";
  if (c.liveVerificationOpenedAt) return "opened";
  if (c.liveVerificationSentAt) return "sent";
  return "none";
}

export const LIVE_STAGE_LABEL: Record<
  ReturnType<typeof liveVerificationStage>,
  string
> = {
  none: "Not sent",
  sent: "Sent — not opened yet",
  opened: "Opened — not started",
  started: "Started with the provider",
};

/**
 * Why this candidate is being asked to do a live check.
 *
 * The same two-minute check either way; what differs is what happened before
 * it, and telling somebody the wrong story is worse than telling them nothing.
 *
 *   agreement  Nothing has gone wrong. It is the identity check that has to
 *              happen before an agreement can be issued, and for most people
 *              this is the only one they will ever see.
 *   retry      They have already tried and it did not settle the question.
 */
export const LIVE_REASONS = ["agreement", "retry"] as const;
export type LiveVerificationReason = (typeof LIVE_REASONS)[number];

export function isLiveReason(v: unknown): v is LiveVerificationReason {
  return typeof v === "string" && (LIVE_REASONS as readonly string[]).includes(v);
}

export const LIVE_REASON_LABEL: Record<LiveVerificationReason, string> = {
  agreement: "Before the agreement",
  retry: "We could not verify their ID",
};

/** What the candidate will actually see in their inbox. */
export const LIVE_REASON_SUBJECT: Record<LiveVerificationReason, string> = {
  agreement: "One last step before we can send your agreement",
  retry: "We were unable to verify your identity — one quick step to finish it",
};

/**
 * The reason a candidate's check was sent for.
 *
 * Defaults to "retry" because that is the only email that existed before this
 * field did. Every check already in somebody's inbox says the photographs
 * could not be read, and the page they land on has to agree with it.
 */
export function liveReasonOf(c: LiveVerificationState): LiveVerificationReason {
  return isLiveReason(c.liveVerificationReason) ? c.liveVerificationReason : "retry";
}

/**
 * Which reason to offer first.
 *
 * Nothing sent yet means this is the ordinary pre-agreement check. Once one
 * has gone out, the reason to be sending another is that the first did not
 * settle it — so the default flips rather than making the same choice twice.
 */
export function defaultLiveReason(c: LiveVerificationState): LiveVerificationReason {
  return c.liveVerificationSentAt ? "retry" : "agreement";
}
