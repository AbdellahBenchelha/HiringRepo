import { NextRequest, NextResponse } from "next/server";
import { buildPersonalMessage, buildSubmittedMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * Telegram notification endpoint used by the application form.
 *
 * "personal"  — sent when the applicant completes the Personal Information step.
 * "submitted" — sent when the applicant submits the completed form.
 *
 * Both messages go out through this single endpoint so they share the exact
 * same, known-working delivery path.
 */

export const runtime = "nodejs";

type Payload =
  | { type: "submitted"; name?: string }
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
    text = buildSubmittedMessage(payload.name);
  } else if (payload.type === "personal") {
    text = buildPersonalMessage(payload.fields ?? {});
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const result = await sendTelegramMessage(text);
  // eslint-disable-next-line no-console
  console.log(`[telegram] type=${payload.type} result=${JSON.stringify(result)}`);
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  if ("skipped" in result) {
    return NextResponse.json({ ok: false, skipped: result.skipped });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
}
