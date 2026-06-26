import { NextRequest, NextResponse } from "next/server";

/**
 * Telegram notification endpoint for the application form.
 *
 * Configure two SERVER-SIDE environment variables (never commit them):
 *   TELEGRAM_BOT_TOKEN  — create a bot with @BotFather to get this token.
 *   TELEGRAM_CHAT_ID    — your personal/group chat id. Message your bot once,
 *                         then read the id from
 *                         https://api.telegram.org/bot<TOKEN>/getUpdates
 *
 * If the variables are not set, the route quietly no-ops so the form keeps
 * working during local development and demos.
 */

export const runtime = "nodejs";

type Payload =
  | { type: "submitted" }
  | { type: "personal"; fields?: Record<string, unknown> };

const PERSONAL_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "dob", label: "Date of birth" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "linkedin", label: "LinkedIn" },
];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildMessage(payload: Payload): string | null {
  if (payload.type === "submitted") {
    return "✅ A candidate has just submitted the application form.";
  }
  if (payload.type === "personal") {
    const fields = payload.fields ?? {};
    const lines = PERSONAL_FIELDS.flatMap(({ key, label }) => {
      const raw = fields[key];
      const value = typeof raw === "string" ? raw.trim() : "";
      if (!value) return [];
      return [`<b>${label}:</b> ${escapeHtml(value.slice(0, 200))}`];
    });
    if (lines.length === 0) return null;
    return ["🧑‍💼 <b>New application — Personal information</b>", "", ...lines].join("\n");
  }
  return null;
}

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Not configured yet — succeed silently so the form is never blocked.
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, skipped: "not_configured" });
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const text = buildMessage(payload);
  if (!text) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // eslint-disable-next-line no-console
      console.error(`[telegram] sendMessage failed: HTTP ${res.status} ${detail}`);
      return NextResponse.json({ ok: false, error: "telegram_error" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[telegram] could not reach api.telegram.org:", err);
    return NextResponse.json({ ok: false, error: "network_error" }, { status: 502 });
  }
}
