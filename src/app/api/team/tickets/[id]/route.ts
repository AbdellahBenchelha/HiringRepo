import { NextRequest, NextResponse } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { addTicketMessage, getTicket } from "@/lib/teamStore";
import { readAttachments, readForm, ticketBody } from "@/lib/teamForms";
import { telegramTeam } from "@/lib/teamNotify";

/** A member replies on one of their own tickets. */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ticket = await getTicket(id);
  if (!ticket || ticket.memberId !== member.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const limit = rateLimit(`team-ticket-reply:${member.id}`, 40, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "team-ticket-reply");

  const form = await readForm(req);
  if (!form) return NextResponse.json({ ok: false, problems: ["The files are too large."] }, { status: 413 });
  const body = ticketBody(form);
  if (!body) return NextResponse.json({ ok: false, problems: ["Write your reply."] }, { status: 400 });
  const files = await readAttachments(form, member.id);
  if (!files.ok) return NextResponse.json({ ok: false, problems: [files.problem] }, { status: 400 });

  await addTicketMessage(id, {
    from: "member",
    body,
    attachments: files.attachments.length ? files.attachments : undefined,
  });
  telegramTeam("💬", `Reply on ticket #${ticket.number}`, member, `Subject: ${ticket.subject}`, `/admin/team-tickets/${ticket.id}`);
  return NextResponse.json({ ok: true });
}
