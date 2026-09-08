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
