/**
 * SERVER-ONLY signed tokens for interview links.
 *
 * The applicant's identity is carried inside a tamper-proof token (HMAC-SHA256
 * signed) rather than a database row, so the whole flow works with no DB and
 * on any host. The token is opaque: the name is encoded, never shown in clear
 * text in the URL.
 *
 * Secret resolution order:
 *   INTERVIEW_TOKEN_SECRET  (set this in production for stable links)
 *   TELEGRAM_BOT_TOKEN      (already configured — convenient default)
 *   a hard-coded dev fallback
 */
import crypto from "node:crypto";

const SECRET =
  process.env.INTERVIEW_TOKEN_SECRET ||
  process.env.TELEGRAM_BOT_TOKEN ||
  "workroute-dev-secret-change-me";

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string): string {
  // 16 bytes of HMAC is plenty of tamper resistance for this low-stakes use,
  // and keeps the token short.
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest().subarray(0, 16));
}

export interface InterviewIdentity {
  /** Stable candidate id used to connect application ↔ interview in storage. */
  id?: string;
  name: string;
  email?: string;
}

/** Build an opaque token that encodes (and signs) the applicant identity. */
export function createInterviewToken(identity: InterviewIdentity): string {
  const body = b64url(
    Buffer.from(JSON.stringify({ i: identity.id ?? "", n: identity.name, e: identity.email ?? "" })),
  );
  return `${body}.${sign(body)}`;
}

/**
 * Link a candidate to one specific offer.
 *
 * Deliberately not the plain `?c=<id>` the assessment link uses. That id is
 * already in circulation — it is forwarded over WhatsApp and sits in the
 * recruiter's Telegram — so anything guarding a page that collects a date of
 * birth, a home address and a passport number has to be narrower than "knows
 * the candidate id".
 *
 * Binding `offerSentAt` into the signature means a re-sent offer silently
 * retires the previous link, which is what you want when terms change: the
 * candidate cannot accept yesterday's rate from an email still in their inbox.
 */
export interface OfferLink {
  id: string;
  /** ISO timestamp of the offer this link belongs to. */
  offerSentAt: string;
}

/** How long an acceptance link stays usable. */
export const OFFER_LINK_TTL_DAYS = 14;

export function createOfferToken(link: OfferLink): string {
  const body = b64url(Buffer.from(JSON.stringify({ i: link.id, s: link.offerSentAt })));
  return `${body}.${sign(body)}`;
}

export type OfferTokenResult =
  | { ok: true; link: OfferLink }
  /** Missing, malformed, or the signature does not match. */
  | { ok: false; reason: "invalid" }
  /** Signed correctly, but issued more than OFFER_LINK_TTL_DAYS ago. */
  | { ok: false; reason: "expired" };

export function readOfferToken(token: string | undefined | null): OfferTokenResult {
  if (!token || !token.includes(".")) return { ok: false, reason: "invalid" };
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, reason: "invalid" };

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: "invalid" };

  try {
    const obj = JSON.parse(fromB64url(body).toString("utf8")) as { i?: unknown; s?: unknown };
    if (typeof obj.i !== "string" || !obj.i) return { ok: false, reason: "invalid" };
    if (typeof obj.s !== "string" || !obj.s) return { ok: false, reason: "invalid" };

    const sentAt = Date.parse(obj.s);
    if (Number.isNaN(sentAt)) return { ok: false, reason: "invalid" };
    // Expiry is read from the signed payload, so it cannot be extended by
    // editing the URL — a tampered timestamp fails the signature check above.
    if (Date.now() - sentAt > OFFER_LINK_TTL_DAYS * 24 * 60 * 60 * 1000) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, link: { id: obj.i, offerSentAt: obj.s } };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Verify and decode a token. Returns null if missing, malformed, or tampered. */
export function readInterviewToken(token: string | undefined | null): InterviewIdentity | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const obj = JSON.parse(fromB64url(body).toString("utf8")) as {
      i?: unknown;
      n?: unknown;
      e?: unknown;
    };
    if (typeof obj.n !== "string" || !obj.n) return null;
    return {
      id: typeof obj.i === "string" && obj.i ? obj.i : undefined,
      name: obj.n,
      email: typeof obj.e === "string" ? obj.e : undefined,
    };
  } catch {
    return null;
  }
}
