import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { getMail } from "@/lib/teamMail";
import { mailAttachmentResponse } from "@/lib/teamMailView";

/** Download an attachment of one of the member's own emails. */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const message = await getMail(req.nextUrl.searchParams.get("id") ?? "");
  if (!message || message.memberId !== s.member.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return mailAttachmentResponse(message, req.nextUrl.searchParams.get("att") ?? "");
}
