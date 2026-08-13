import { NextRequest, NextResponse } from "next/server";
import { saveApplication } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Saves the full application for the Admin Panel when a candidate submits the
 * form. This is separate from — and does not affect — the Telegram
 * notifications, which continue to fire from the client as before.
 */

export const runtime = "nodejs";

/** Each application is written once; the allowance covers retries. */
const MAX_REQUESTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`applications:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  // This body carries the whole application, so it gets the largest cap.
  const parsed = await readJsonBody<{ id?: string; application?: Record<string, unknown> }>(req);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

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
