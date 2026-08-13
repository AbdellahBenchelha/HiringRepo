/**
 * SERVER-ONLY admin authentication.
 *
 * - Credentials come from env (ADMIN_USERNAME / ADMIN_PASSWORD), defaulting to
 *   admin / admin321 so it works out of the box. Set them in .env.local for
 *   production so they are not the defaults.
 * - The session is a signed (HMAC-SHA256) cookie; tampering invalidates it.
 * - CSRF: the signed session embeds a random csrf token, also exposed in a
 *   readable cookie. State-changing requests must echo it in the x-csrf-token
 *   header (double-submit).
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newId } from "@/lib/id";

/**
 * These fallbacks exist so the panel works on a fresh clone. They are also
 * committed to a public repository, which means anyone can read them — so in
 * production they are refused outright rather than used. See isMisconfigured().
 */
const DEV_SECRET = "workroute-admin-dev-secret-change-me";
const DEV_PASSWORD = "admin321";

const SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.INTERVIEW_TOKEN_SECRET ||
  process.env.TELEGRAM_BOT_TOKEN ||
  DEV_SECRET;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEV_PASSWORD;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * True when production is running on a credential an attacker already knows.
 *
 * The signing secret is the dangerous one: with it, a session cookie can be
 * forged and the password never comes into it. So auth fails closed here — a
 * locked-out administrator is recoverable, a silently open admin panel full of
 * candidate PII is not.
 */
function misconfiguration(): string | null {
  if (!IS_PRODUCTION) return null;
  if (SECRET === DEV_SECRET) {
    return "ADMIN_SESSION_SECRET is not set. The built-in fallback is public, so admin sessions could be forged.";
  }
  if (ADMIN_PASSWORD === DEV_PASSWORD) {
    return "ADMIN_PASSWORD is not set. The built-in default is public.";
  }
  if (ADMIN_PASSWORD.length < 12) {
    return "ADMIN_PASSWORD is shorter than 12 characters.";
  }
  return null;
}

let warned = false;
function refuseIfMisconfigured(): boolean {
  const problem = misconfiguration();
  if (!problem) return false;
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.error(
      `[admin] Refusing all admin access: ${problem}\n` +
        "[admin] Set ADMIN_SESSION_SECRET and ADMIN_PASSWORD in your host's environment, then redeploy.\n" +
        `[admin] Generate a secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }
  return true;
}

/** Surfaced on the login screen so the cause is visible, not a silent failure. */
export function adminConfigError(): string | null {
  return misconfiguration();
}

export const SESSION_COOKIE = "wr_admin";
export const CSRF_COOKIE = "wr_admin_csrf";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

interface SessionPayload {
  u: string;
  csrf: string;
  iat: number;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Constant-time-ish credential check. */
export function checkCredentials(username: string, password: string): boolean {
  if (refuseIfMisconfigured()) return false;
  const u = safeEqual(username || "", ADMIN_USERNAME);
  const p = safeEqual(password || "", ADMIN_PASSWORD);
  return u && p;
}

export function createSession(): { token: string; csrf: string } {
  const payload: SessionPayload = { u: ADMIN_USERNAME, csrf: newId(16), iat: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${sign(body)}`, csrf: payload.csrf };
}

export function parseSession(token: string | undefined | null): SessionPayload | null {
  // Reject before verifying: if the secret is the public fallback, a valid
  // signature proves nothing.
  if (refuseIfMisconfigured()) return null;
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const obj = JSON.parse(fromB64url(body).toString("utf8")) as SessionPayload;
    if (!obj || obj.u !== ADMIN_USERNAME) return null;
    if (Date.now() - obj.iat > SESSION_MAX_AGE * 1000) return null;
    return obj;
  } catch {
    return null;
  }
}

/** Read & verify the current admin session (server components / route handlers). */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

/** Use in admin server components: redirects to login if not authenticated. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Verify a state-changing request: valid session + matching CSRF header. */
export async function verifyAdminRequest(csrfHeader: string | null): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) return false;
  return !!csrfHeader && safeEqual(csrfHeader, session.csrf);
}
