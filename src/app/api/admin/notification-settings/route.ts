import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { saveNotificationSettings } from "@/lib/notificationSettings";

/** Save how noisy Telegram should be. */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { quietUntilAssessment?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (typeof body.quietUntilAssessment !== "boolean") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await saveNotificationSettings(body.quietUntilAssessment);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
