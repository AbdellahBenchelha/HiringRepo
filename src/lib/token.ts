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
