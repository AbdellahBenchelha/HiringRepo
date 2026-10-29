import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { getMail } from "@/lib/teamMail";
import { mailViewResponse } from "@/lib/teamMailView";

/**
 * Any team email, read-only, for the team admin panel. Opening one is
 * recorded on the page that shows it (admin/team/[id]/mail/[mailId]).
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const message = await getMail(req.nextUrl.searchParams.get("id") ?? "");
  if (!message) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return mailViewResponse(message, req.nextUrl.searchParams.get("images") === "1");
}
