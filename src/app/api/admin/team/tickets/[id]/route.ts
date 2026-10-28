import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { addTicketMessage, getMember, getTicket, updateTicket } from "@/lib/teamStore";
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from "@/lib/teamShared";
import { readAttachments, readForm, ticketBody } from "@/lib/teamForms";
import { alertTicket } from "@/lib/teamNotify";

/**
 * One ticket, from the Admin Panel.
 *
 *   form { body, files }          reply (the member is emailed)
 *   JSON { status?, priority? }   change the ticket
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  const ticket = await getTicket(id);
  if (!ticket) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const parsed = await readJsonBody<{ status?: unknown; priority?: unknown }>(req, 1024);
    if (!parsed.ok) return badBodyResponse(parsed.reason);
    const status = (TICKET_STATUSES as readonly unknown[]).includes(parsed.data.status)
      ? (parsed.data.status as TicketStatus)
      : undefined;
    const priority = (TICKET_PRIORITIES as readonly unknown[]).includes(parsed.data.priority)
      ? (parsed.data.priority as TicketPriority)
      : undefined;
    await updateTicket(id, { status, priority });
    return NextResponse.json({ ok: true });
  }

  const form = await readForm(req);
  if (!form) return NextResponse.json({ ok: false, problems: ["The files are too large."] }, { status: 413 });
  const body = ticketBody(form);
  if (!body) return NextResponse.json({ ok: false, problems: ["Write your reply."] }, { status: 400 });
  const files = await readAttachments(form, ticket.memberId);
  if (!files.ok) return NextResponse.json({ ok: false, problems: [files.problem] }, { status: 400 });
  const saved = await addTicketMessage(id, {
    from: "admin",
    by,
    body,
    attachments: files.attachments.length ? files.attachments : undefined,
  });
  const member = await getMember(ticket.memberId);
  if (saved && member) await alertTicket(member, saved, "reply");
  return NextResponse.json({ ok: true });
}
