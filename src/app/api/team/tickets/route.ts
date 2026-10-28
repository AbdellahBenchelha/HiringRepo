import { NextRequest, NextResponse } from "next/server";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { createTickets } from "@/lib/teamStore";
import { MAX_TICKET_SUBJECT, TICKET_PRIORITIES, type TicketPriority } from "@/lib/teamShared";
import { field, readAttachments, readForm, ticketBody } from "@/lib/teamForms";
import { telegramTeam } from "@/lib/teamNotify";

/** A member opens a ticket: a question, a problem, anything for the team. */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const limit = rateLimit(`team-ticket-new:${member.id}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "team-ticket-new");

  const form = await readForm(req);
  if (!form) return NextResponse.json({ ok: false, problems: ["The files are too large."] }, { status: 413 });
  const subject = field(form, "subject", MAX_TICKET_SUBJECT).replace(/\s+/g, " ");
  const body = ticketBody(form);
  const p = field(form, "priority", 20);
  const priority: TicketPriority = (TICKET_PRIORITIES as readonly string[]).includes(p) ? (p as TicketPriority) : "normal";
  const problems: string[] = [];
  if (!subject) problems.push("Write a subject.");
  if (!body) problems.push("Write your message.");
  if (problems.length) return NextResponse.json({ ok: false, problems }, { status: 400 });

  const files = await readAttachments(form, member.id);
  if (!files.ok) return NextResponse.json({ ok: false, problems: [files.problem] }, { status: 400 });

  const [ticket] = await createTickets([member.id], {
    subject,
    body,
    priority,
    from: "member",
    attachments: files.attachments.length ? files.attachments : undefined,
  });
  telegramTeam("🎫", `New ticket #${ticket.number} from a member`, member, `Subject: ${subject}`, `/admin/team-tickets/${ticket.id}`);
  return NextResponse.json({ ok: true, id: ticket.id });
}
