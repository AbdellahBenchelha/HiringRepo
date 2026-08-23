import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { setNotes } from "@/lib/store";
import { readJsonBody, badBodyResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const parsed = await readJsonBody<{ notes?: string }>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const { id } = await ctx.params;
  const updated = await setNotes(id, String(parsed.data.notes ?? ""));
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, notesUpdatedAt: updated.notesUpdatedAt });
}
