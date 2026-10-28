import { NextResponse } from "next/server";
import { clearMemberCookies } from "@/lib/teamAuth";

export const runtime = "nodejs";

export async function POST() {
  await clearMemberCookies();
  return NextResponse.json({ ok: true });
}
