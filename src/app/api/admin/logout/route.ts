import { NextResponse } from "next/server";
import { SESSION_COOKIE, CSRF_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(CSRF_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
