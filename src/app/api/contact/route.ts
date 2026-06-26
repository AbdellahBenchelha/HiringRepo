import { NextRequest, NextResponse } from "next/server";
import { buildContactMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * Contact-form endpoint. Forwards the message to the team's Telegram chat.
 * Best-effort delivery: the sender always gets a successful confirmation.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let fields: Record<string, string>;
  try {
    const fd = await req.formData();
    fields = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await sendTelegramMessage(buildContactMessage(fields));

  return NextResponse.json({ ok: true });
}
