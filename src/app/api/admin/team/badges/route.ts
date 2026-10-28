import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { teamAttention } from "@/lib/teamAttention";

/** The numbers on the Admin Panel's team tabs: what is waiting for a recruiter. */

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await teamAttention()) });
}
