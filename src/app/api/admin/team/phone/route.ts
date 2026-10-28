import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { addPhoneMessage, deletePhoneMessage, getMember } from "@/lib/teamStore";
import { MAX_PHONE_MESSAGE } from "@/lib/teamShared";
import { alertPhone } from "@/lib/teamNotify";

/**
 * Put a message into a member's phone inbox — typed in by a recruiter from
 * what arrived on the number provided for them.
 *
 *   POST   { memberId, sender, body }
 *   DELETE ?id=<message id>
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const parsed = await readJsonBody<{ memberId?: unknown; sender?: unknown; body?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const member = typeof parsed.data.memberId === "string" ? await getMember(parsed.data.memberId) : null;
  const sender = typeof parsed.data.sender === "string" ? parsed.data.sender.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const body = typeof parsed.data.body === "string" ? parsed.data.body.replace(/\r\n/g, "\n").trim().slice(0, MAX_PHONE_MESSAGE) : "";
  const problems: string[] = [];
  if (!member) problems.push("Choose the member.");
  else if (!member.phoneNumber) problems.push("This member has no phone number yet. Add one on their page first.");
  if (!sender) problems.push("Write who the message is from (e.g. Amazon, or the number).");
  if (!body) problems.push("Write the message.");
  if (problems.length || !member?.phoneNumber) return NextResponse.json({ ok: false, problems }, { status: 400 });

  const msg = await addPhoneMessage({ memberId: member.id, number: member.phoneNumber, sender, body, by });
  await alertPhone(member);
  return NextResponse.json({ ok: true, id: msg.id });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") ?? "";
  return (await deletePhoneMessage(id))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}
