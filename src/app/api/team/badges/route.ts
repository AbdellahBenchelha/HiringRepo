import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { listPhoneMessages, listTickets, ticketUnread } from "@/lib/teamStore";
import { unreadCount } from "@/lib/teamMail";

/** The red numbers on the portal's Mail, Tickets and Phone tabs. */

export const runtime = "nodejs";

export async function GET() {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const [tickets, phone, mail] = await Promise.all([
    listTickets({ memberId: s.member.id }),
    listPhoneMessages(s.member.id),
    unreadCount(s.member.id),
  ]);
  return NextResponse.json({
    ok: true,
    tickets: tickets.filter((t) => ticketUnread(t, "member")).length,
    phone: phone.filter((p) => !p.readAt).length,
    mail,
  });
}
