import { NextRequest, NextResponse } from "next/server";
import {
  checkCredentials,
  createSession,
  SESSION_COOKIE,
  CSRF_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

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
