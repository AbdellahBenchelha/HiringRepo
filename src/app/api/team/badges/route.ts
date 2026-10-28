import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { listPhoneMessages, listTickets, ticketUnread } from "@/lib/teamStore";

/** The red numbers on the portal's Tickets and Phone tabs. */

export const runtime = "nodejs";

export async function GET() {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const [tickets, phone] = await Promise.all([listTickets({ memberId: s.member.id }), listPhoneMessages(s.member.id)]);
  return NextResponse.json({
    ok: true,
    tickets: tickets.filter((t) => ticketUnread(t, "member")).length,
    phone: phone.filter((p) => !p.readAt).length,
  });
}
