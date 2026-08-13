import { NextRequest, NextResponse } from "next/server";
import { buildContactMessage, sendTelegramMessage } from "@/lib/telegram";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Contact-form endpoint. Forwards the message to the team's Telegram chat.
 * Best-effort delivery: the sender always gets a successful confirmation.
 */

export const runtime = "nodejs";

/** Contact is the easiest endpoint to abuse for spam, so it is the tightest. */
const MAX_REQUESTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** Trim before the message is built so an oversized field can't be relayed. */
function cap(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").slice(0, max);
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`contact:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > 64 * 1024) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let fields: Record<string, string>;
  try {
    const fd = await req.formData();
    // A filled honeypot means a bot. Answer 200 so it learns nothing.
    if (String(fd.get("company_website_hp") ?? "").trim() !== "") {
      return NextResponse.json({ ok: true });
    }
    fields = {
      name: cap(fd.get("name"), 200),
      email: cap(fd.get("email"), 200),
      subject: cap(fd.get("subject"), 200),
      message: cap(fd.get("message"), 4000),
    };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await sendTelegramMessage(buildContactMessage(fields));

  return NextResponse.json({ ok: true });
}
