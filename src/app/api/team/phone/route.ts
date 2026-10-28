import { NextRequest, NextResponse } from "next/server";
import { getMemberSession, verifyMemberRequest } from "@/lib/teamAuth";
import { listPhoneMessages, markPhoneRead } from "@/lib/teamStore";

/**
 * The member's phone inbox.
 *
 *   GET            the newest messages, for the page to check for new ones
 *   POST {read}    mark them all as read (the page does this when shown)
 */

export const runtime = "nodejs";

export async function GET() {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const messages = (await listPhoneMessages(s.member.id)).slice(0, 100).map(({ by: _by, ...m }) => m);
  return NextResponse.json({ ok: true, messages });
}

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  await markPhoneRead(member.id);
  return NextResponse.json({ ok: true });
}
