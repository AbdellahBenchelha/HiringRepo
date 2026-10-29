import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getMail } from "@/lib/teamMail";
import { mailAttachmentResponse } from "@/lib/teamMailView";

/** Download an attachment of any team email, for the team admin panel. */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const message = await getMail(req.nextUrl.searchParams.get("id") ?? "");
  if (!message) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return mailAttachmentResponse(message, req.nextUrl.searchParams.get("att") ?? "");
}
