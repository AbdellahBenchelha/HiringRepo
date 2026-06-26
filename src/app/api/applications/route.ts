import { NextRequest, NextResponse } from "next/server";
import { saveApplication } from "@/lib/store";

/**
 * Saves the full application for the Admin Panel when a candidate submits the
 * form. This is separate from — and does not affect — the Telegram
 * notifications, which continue to fire from the client as before.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { id?: string; application?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const application = body.application && typeof body.application === "object" ? body.application : {};
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    await saveApplication(id, application);
  } catch {
    return NextResponse.json({ ok: false, error: "storage_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
