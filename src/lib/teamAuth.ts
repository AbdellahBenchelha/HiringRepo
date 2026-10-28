/**
 * SERVER-ONLY sign-in for the team portal.
 *
 * No passwords. A member types the personal email they applied with and is
 * sent a six-digit code; the code is good for ten minutes and five tries, and
 * is held in memory only — a restart simply means asking for a new one.
 *
 * The session is a signed cookie, like the Admin Panel's, carrying the
 * member's id and their session version. Raising the version (Sign out of
 * every device, or a recruiter doing it for them) retires every cookie issued
 * before, wherever it is. CSRF is the same double-submit as the Admin Panel.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { newId } from "@/lib/id";
import { getMember, getMemberByEmail, type TeamMember } from "@/lib/teamStore";

const DEV_SECRET = "workroute-admin-dev-secret-change-me";
const BASE =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.INTERVIEW_TOKEN_SECRET ||
  process.env.TELEGRAM_BOT_TOKEN ||
  DEV_SECRET;

/** Derived, so a portal cookie can never be replayed as an admin one. */
const SECRET = crypto.createHmac("sha256", BASE).update("team-portal-session-v1").digest();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const TEAM_COOKIE = "wr_team";
export const TEAM_CSRF_COOKIE = "wr_team_csrf";
export const TEAM_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_TRIES = 5;

function refused(): boolean {
  return IS_PRODUCTION && BASE === DEV_SECRET;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

interface Payload {
  m: string;
  v: number;
  csrf: string;
  iat: number;
}

export function createMemberSession(member: TeamMember): { token: string; csrf: string } {
  const payload: Payload = { m: member.id, v: member.sessionVersion ?? 1, csrf: newId(16), iat: Date.now() };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return { token: `${body}.${sign(body)}`, csrf: payload.csrf };
}

function parse(token: string | undefined): Payload | null {
  if (refused() || !token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as Payload;
    if (!p?.m || Date.now() - p.iat > TEAM_SESSION_MAX_AGE * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

/** Whether this member may use the portal at all. */
export function canSignIn(m: TeamMember): boolean {
  return m.status !== "left";
}

export async function getMemberSession(): Promise<{ member: TeamMember; csrf: string } | null> {
  const store = await cookies();
  const p = parse(store.get(TEAM_COOKIE)?.value);
  if (!p) return null;
  const member = await getMember(p.m);
  if (!member || !canSignIn(member) || (member.sessionVersion ?? 1) !== p.v) return null;
  return { member, csrf: p.csrf };
}

/** Portal pages: the signed-in member, or off to the sign-in page. */
export async function requireMember(): Promise<TeamMember> {
  const s = await getMemberSession();
  if (!s) redirect("/login");
  return s.member;
}

/** A state-changing request from the portal: a session and the matching CSRF header. */
export async function verifyMemberRequest(csrfHeader: string | null): Promise<TeamMember | null> {
  const s = await getMemberSession();
  if (!s || !csrfHeader || !safeEqual(csrfHeader, s.csrf)) return null;
  return s.member;
}

export async function setMemberCookies(member: TeamMember): Promise<void> {
  const { token, csrf } = createMemberSession(member);
  const store = await cookies();
  const secure = IS_PRODUCTION;
  store.set(TEAM_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: TEAM_SESSION_MAX_AGE });
  store.set(TEAM_CSRF_COOKIE, csrf, { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: TEAM_SESSION_MAX_AGE });
}

export async function clearMemberCookies(): Promise<void> {
  const store = await cookies();
  store.delete(TEAM_COOKIE);
  store.delete(TEAM_CSRF_COOKIE);
}

/* -------------------------------------------------------------------------- */
/* Sign-in codes                                                               */
/* -------------------------------------------------------------------------- */

interface PendingCode {
  hash: string;
  expires: number;
  tries: number;
}

// On globalThis so every route bundle sees the same codes.
const g = globalThis as unknown as { __teamCodes?: Map<string, PendingCode> };
const codes = (g.__teamCodes ??= new Map<string, PendingCode>());

function hashCode(memberId: string, code: string): string {
  return crypto.createHmac("sha256", SECRET).update(`${memberId}:${code}`).digest("hex");
}

/** A fresh code for the member with this email, or null if there is none. */
export async function issueLoginCode(email: string): Promise<{ member: TeamMember; code: string } | null> {
  if (refused()) return null;
  const member = await getMemberByEmail(email);
  if (!member || !canSignIn(member)) return null;
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  codes.set(member.id, { hash: hashCode(member.id, code), expires: Date.now() + CODE_TTL_MS, tries: 0 });
  return { member, code };
}

export type CodeCheck =
  | { ok: true; member: TeamMember }
  | { ok: false; reason: "wrong" | "expired" | "locked" };

export async function checkLoginCode(email: string, code: string): Promise<CodeCheck> {
  const member = await getMemberByEmail(email);
  if (!member || !canSignIn(member)) return { ok: false, reason: "wrong" };
  const pending = codes.get(member.id);
  if (!pending || Date.now() > pending.expires) {
    codes.delete(member.id);
    return { ok: false, reason: "expired" };
  }
  if (pending.tries >= CODE_TRIES) return { ok: false, reason: "locked" };
  pending.tries += 1;
  if (!safeEqual(pending.hash, hashCode(member.id, code.replace(/\D/g, "")))) {
    return { ok: false, reason: pending.tries >= CODE_TRIES ? "locked" : "wrong" };
  }
  codes.delete(member.id);
  return { ok: true, member };
}

/** "Chrome on Android" from a user agent — enough to recognise a device. */
export function describeDevice(ua: string | null): string {
  const s = ua ?? "";
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\//.test(s)
      ? "Opera"
      : /Chrome\//.test(s)
        ? "Chrome"
        : /Firefox\//.test(s)
          ? "Firefox"
          : /Safari\//.test(s)
            ? "Safari"
            : "Browser";
  const os = /Android/.test(s)
    ? "Android"
    : /iPhone|iPad|iPod/.test(s)
      ? "iPhone / iPad"
      : /Windows/.test(s)
        ? "Windows"
        : /Mac OS X/.test(s)
          ? "Mac"
          : /Linux/.test(s)
            ? "Linux"
            : "unknown device";
  return `${browser} on ${os}`;
}
