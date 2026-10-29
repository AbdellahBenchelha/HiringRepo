import { NextRequest, NextResponse } from "next/server";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { deleteMail, getMail, markRead } from "@/lib/teamMail";

/**
 * One of the member's own emails.
 *
 *   { action: "delete" }   remove it, and its attachments
 *   { action: "unread" }   mark it unread again
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const message = await getMail(id);
  if (!message || message.memberId !== member.id) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const parsed = await readJsonBody<{ action?: string }>(req, 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  if (parsed.data.action === "delete") {
    await deleteMail(id);
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "unread") {
    await markRead(id, false);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
