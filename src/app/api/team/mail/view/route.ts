import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { getMail } from "@/lib/teamMail";
import { mailViewResponse } from "@/lib/teamMailView";

/** One of the member's own emails, as a sandboxed page for the reading pane. */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const message = await getMail(req.nextUrl.searchParams.get("id") ?? "");
  if (!message || message.memberId !== s.member.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return mailViewResponse(message, req.nextUrl.searchParams.get("images") === "1");
}
