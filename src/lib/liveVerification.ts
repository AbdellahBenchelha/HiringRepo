/**
 * The live identity check, run by Persona.
 *
 * When the photographs a candidate sent cannot settle the question — a blurred
 * document, a face that could be anyone, a card that looks retouched — the
 * recruiter creates an inquiry in Persona for that one person and pastes its
 * link here. Persona then does what photographs by email cannot: it watches
 * the document and the face at the same moment, on a device it can measure.
 *
 * Pure module — no filesystem, no node built-ins — so the admin form and the
 * route that sends the email agree on what a usable link is.
 */

/**
 * Where a verification link is allowed to point.
 *
 * The whole feature is "type a URL, and we email it to a candidate over the
 * company's name". That is a phishing tool with a nice interface unless the
 * destination is pinned: an admin session in the wrong hands could otherwise
 * send a bank login page to fifty people who are expecting a message from us
 * and inclined to trust it. Pinning it to the provider costs the recruiter
 * nothing, because that is the only place their links come from.
 */
const ALLOWED_HOSTS = ["withpersona.com"] as const;

export const PROVIDER_NAME = "Persona";
export const MAX_LINK_LENGTH = 600;

function hostAllowed(host: string): boolean {
  const lower = host.toLowerCase();
  return ALLOWED_HOSTS.some((h) => lower === h || lower.endsWith(`.${h}`));
}

export type LinkCheck =
  | { ok: true; url: string }
  | { ok: false; problem: string };

/**
 * Is this a link we are willing to send to a candidate?
 *
 * Returns the URL normalised by the parser rather than the raw string, so what
 * is stored and what was checked are the same text.
 */
export function checkVerificationLink(input: string): LinkCheck {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, problem: `Paste the ${PROVIDER_NAME} link for this candidate.` };
  if (raw.length > MAX_LINK_LENGTH) {
    return { ok: false, problem: "That link is too long to be a verification link." };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, problem: "That is not a valid link. Paste the whole URL, starting https://" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, problem: "The link must start with https://" };
  }
  if (!hostAllowed(url.hostname)) {
    return {
      ok: false,
      problem: `We only send ${PROVIDER_NAME} links (withpersona.com). Check you copied the right one.`,
    };
  }

  return { ok: true, url: url.toString() };
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
  started: `Started at ${PROVIDER_NAME}`,
};
