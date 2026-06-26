import { NextRequest, NextResponse } from "next/server";
import { SUBMITTED_MESSAGE, sendTelegramMessage } from "@/lib/telegram";

/**
 * Application submission endpoint.
 *
 * The recruitment team receives applications through Telegram. The applicant's
 * personal details were already sent when they completed the first step, so on
 * final submit we send a simple confirmation that a candidate submitted the
 * form. Sending happens server-side here (not from the browser), so it is
 * reliable and never lost when the form unmounts to show the success screen.
 *
 * Telegram delivery is best-effort: even if it fails or is not configured, the
 * applicant still receives a successful confirmation so the form is never
 * blocked.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Drain the request body (form fields + any uploaded files).
  try {
    await req.formData();
  } catch {
    /* ignore malformed bodies — we still acknowledge so the UX isn't blocked */
  }

  await sendTelegramMessage(SUBMITTED_MESSAGE);

  return NextResponse.json({ ok: true });
}
