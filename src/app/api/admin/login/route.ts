import { NextRequest, NextResponse } from "next/server";
import {
  adminConfigError,
  checkCredentials,
  createSession,
  SESSION_COOKIE,
  CSRF_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/adminAuth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

export const runtime = "nodejs";

/** Password guessing budget: 8 attempts per IP per 15 minutes. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  // Refuse before touching credentials. The reason is logged, never returned:
  // telling an anonymous caller "the signing secret is the public default"
  // hands them the attack.
  if (adminConfigError()) {
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 503 });
  }

  const parsed = await readJsonBody<{ username?: string; password?: string }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  if (!checkCredentials(String(body.username ?? ""), String(body.password ?? ""))) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const { token, csrf } = createSession();
  const res = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  // Readable by the admin client for the double-submit CSRF check.
  res.cookies.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
