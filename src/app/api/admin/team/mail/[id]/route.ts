import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { assignMail, deleteMail, getMail } from "@/lib/teamMail";
import { getMember } from "@/lib/teamStore";
import { alertMail } from "@/lib/teamNotify";

/**
 * Mail that reached an address no member has. Members' own mail is
 * read-only here; only these can be changed.
 *
 *   { action: "assign", memberId }   put it in that member's inbox
 *   { action: "delete" }
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  const message = await getMail(id);
  if (!message || message.memberId !== null) {
    return NextResponse.json({ ok: false, problems: ["Only mail to an unknown address can be changed."] }, { status: 404 });
  }
  const parsed = await readJsonBody<{ action?: string; memberId?: unknown }>(req, 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  if (parsed.data.action === "assign") {
    const member = typeof parsed.data.memberId === "string" ? await getMember(parsed.data.memberId) : null;
    if (!member) return NextResponse.json({ ok: false, problems: ["Choose the member."] }, { status: 400 });
    await assignMail(id, member.id);
    await alertMail(member);
    // eslint-disable-next-line no-console
    console.log(`[mail] ${by} moved unknown-address mail ${id} to ${member.id}`);
    return NextResponse.json({ ok: true });
  }
  if (parsed.data.action === "delete") {
    await deleteMail(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
