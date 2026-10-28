import { NextRequest, NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { listTickets } from "@/lib/teamStore";
import { presignView } from "@/lib/r2";

/**
 * Open one file — a ticket screenshot or a shared document — for the member
 * it belongs to. The key must be on one of their own tickets or documents;
 * anything else is "not found", whoever asks.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key") ?? "";
  const m = session.member;

  let found: { name: string; type: string } | undefined = m.documents?.find((d) => d.key === key);
  if (!found) {
    for (const t of await listTickets({ memberId: m.id })) {
      for (const msg of t.messages) {
        const a = msg.attachments?.find((x) => x.key === key);
        if (a) found = a;
      }
    }
  }
  if (!found) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const url = await presignView(key, found.name, found.type);
  if (!url) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  return NextResponse.redirect(url, 302);
}
