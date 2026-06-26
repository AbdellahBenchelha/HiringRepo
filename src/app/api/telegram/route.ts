import { NextRequest, NextResponse } from "next/server";
import { buildPersonalMessage, SUBMITTED_MESSAGE, sendTelegramMessage } from "@/lib/telegram";

/**
 * Telegram notification endpoint used by the application form.
 *
 * "personal"  — sent when the applicant completes the Personal Information step.
 * "submitted" — kept for completeness; the final submit notification is sent
 *               server-side by /api/apply (see that route).
 */

export const runtime = "nodejs";

type Payload =
  | { type: "submitted" }
  | { type: "personal"; fields?: Record<string, unknown> };

export async function POST(req: NextRequest) {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  let text: string | null = null;
  if (payload.type === "submitted") {
    text = SUBMITTED_MESSAGE;
  } else if (payload.type === "personal") {
    text = buildPersonalMessage(payload.fields ?? {});
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await sendTelegramMessage(text);
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  if ("skipped" in result) {
    return NextResponse.json({ ok: false, skipped: result.skipped });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
}
