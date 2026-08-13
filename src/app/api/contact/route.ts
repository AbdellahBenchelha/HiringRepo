import { NextRequest, NextResponse } from "next/server";
import { buildContactMessage, sendTelegramMessage } from "@/lib/telegram";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Contact-form endpoint. Forwards the message to the team's Telegram chat.
 * Best-effort delivery: the sender always gets a successful confirmation.
 */

export const runtime = "nodejs";

/**
 * Contact is the easiest endpoint to abuse, so it stays the tightest of the
 * public routes — but still sized for many people sharing one carrier IP.
 */
const MAX_REQUESTS = 15;
const WINDOW_MS = 15 * 60 * 1000;

/** Trim before the message is built so an oversized field can't be relayed. */
function cap(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").slice(0, max);
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`contact:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "contact");

  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > 64 * 1024) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let fields: Record<string, string>;
  let suspectedBot = false;
  try {
    const fd = await req.formData();
    // Flag rather than drop: autofill trips honeypots too, and a silently
    // discarded message from a real person is worse than a labelled one.
    if (String(fd.get("wr_extra_field") ?? "").trim() !== "") {
      // eslint-disable-next-line no-console
      console.warn(`[contact] honeypot filled by ${clientIp(req)}; forwarding with a warning`);
      suspectedBot = true;
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

  const warning = suspectedBot
    ? "\n\n⚠️ <b>Possible spam:</b> a hidden anti-bot field was filled. Browser autofill can do this too, so read it before dismissing."
    : "";
  await sendTelegramMessage(buildContactMessage(fields) + warning);

  return NextResponse.json({ ok: true });
}
