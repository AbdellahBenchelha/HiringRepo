import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { createTickets, getMember } from "@/lib/teamStore";
import { MAX_TICKET_SUBJECT, TICKET_PRIORITIES, type TicketPriority } from "@/lib/teamShared";
import { field, readAttachments, readForm, ticketBody } from "@/lib/teamForms";
import { alertTicket } from "@/lib/teamNotify";

/**
 * Send a ticket to one member or several at once. Each member gets their own
 * copy, numbered separately, so their replies stay private to them.
 *
 *   form { memberIds (repeated), subject, body, priority, files (repeated) }
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const form = await readForm(req);
  if (!form) return NextResponse.json({ ok: false, problems: ["The files are too large."] }, { status: 413 });

  const ids = [...new Set(form.getAll("memberIds").filter((v): v is string => typeof v === "string" && !!v))];
  const members = (await Promise.all(ids.map((i) => getMember(i)))).filter((m) => m && m.status !== "left");
  const subject = field(form, "subject", MAX_TICKET_SUBJECT).replace(/\s+/g, " ");
  const body = ticketBody(form);
  const p = field(form, "priority", 20);
  const priority: TicketPriority = (TICKET_PRIORITIES as readonly string[]).includes(p) ? (p as TicketPriority) : "normal";
  const problems: string[] = [];
  if (!members.length) problems.push("Choose at least one member.");
  if (!subject) problems.push("Write a subject.");
  if (!body) problems.push("Write the message.");
  if (problems.length) return NextResponse.json({ ok: false, problems }, { status: 400 });

  const files = await readAttachments(form, "shared");
  if (!files.ok) return NextResponse.json({ ok: false, problems: [files.problem] }, { status: 400 });

  const tickets = await createTickets(
    members.map((m) => m!.id),
    { subject, body, priority, from: "admin", by, attachments: files.attachments.length ? files.attachments : undefined },
  );
  for (const t of tickets) {
    const m = members.find((x) => x!.id === t.memberId)!;
    await alertTicket(m, t, "new");
  }
  // One ticket opens straight away; several go back to the list.
  return NextResponse.json({ ok: true, ids: tickets.map((t) => t.id), id: tickets.length === 1 ? tickets[0].id : undefined });
}
