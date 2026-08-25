/**
 * SERVER-ONLY Telegram helpers.
 *
 * Never import this into a client component — it reads the bot token from
 * server-side environment variables (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID).
 *
 * Configure the two variables in `.env.local` (git-ignored):
 *   TELEGRAM_BOT_TOKEN — create a bot with @BotFather to get this token.
 *   TELEGRAM_CHAT_ID   — message your bot once, then read the id from
 *                        https://api.telegram.org/bot<TOKEN>/getUpdates
 *
 * If the variables are not set, sending quietly no-ops so the forms keep
 * working during local development and demos.
 */

const PERSONAL_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "dob", label: "Date of birth" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "ssn", label: "SSN (US verification)" },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "linkedin", label: "LinkedIn" },
];

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Simple confirmation sent when an applicant submits the full form.
 *
 * `suspectedBot` means the hidden honeypot field was filled. It is only a hint
 * — browser autofill reaches hidden fields too — so the message is still sent
 * and merely carries a warning for the recruiter to weigh.
 */
export function buildSubmittedMessage(name?: string, suspectedBot?: boolean): string {
  const who = typeof name === "string" ? name.trim() : "";
  const base = who
    ? `✅ ${escapeHtml(who.slice(0, 120))} has just submitted the application form.`
    : "✅ A candidate has just submitted the application form.";
  if (!suspectedBot) return base;
  return `${base}\n\n⚠️ <b>Possible spam:</b> a hidden anti-bot field was filled. This can also happen with browser autofill, so check the application before dismissing it.`;
}

/**
 * Message sent to the recruiter when an applicant completes the interview.
 *
 * Deliberately short: who finished, and how they scored. The written answers
 * used to be included here, which made every notification long enough to need
 * scrolling and put a candidate's answers into a chat history that is easy to
 * forward. They are all in the Admin Panel, which is where they are read
 * properly and where access is controlled.
 */
export function buildInterviewResultMessage(
  name: string,
  email: string | undefined,
  country: string | undefined,
  correct: number,
  total: number,
): string {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const lines = [
    "📩 <b>Interview completed</b>",
    "",
    `<b>Name:</b> ${escapeHtml(name)}`,
  ];
  if (email) lines.push(`<b>Email:</b> ${escapeHtml(email)}`);
  if (country) lines.push(`<b>Country:</b> ${escapeHtml(country)}`);
  lines.push(`<b>Score:</b> ${correct} / ${total} (${pct}%)`);
  return lines.join("\n");
}

/** Build the "Personal information" message (sent after the first step). */
export function buildPersonalMessage(fields: Record<string, unknown>): string | null {
  const lines = PERSONAL_FIELDS.flatMap(({ key, label }) => {
    const raw = fields[key];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) return [];
    return [`<b>${label}:</b> ${escapeHtml(value.slice(0, 200))}`];
  });
  if (lines.length === 0) return null;
  return ["🧑‍💼 <b>New application — Personal information</b>", "", ...lines].join("\n");
}

/** Build the contact-form message. */
export function buildContactMessage(fields: Record<string, unknown>): string {
  const get = (key: string, max: number) => {
    const raw = fields[key];
    return typeof raw === "string" ? escapeHtml(raw.trim().slice(0, max)) : "";
  };
  return [
    "✉️ <b>New contact message</b>",
    "",
    `<b>Name:</b> ${get("name", 200)}`,
    `<b>Email:</b> ${get("email", 200)}`,
    `<b>Subject:</b> ${get("subject", 200)}`,
    "",
    get("message", 2000),
  ].join("\n");
}

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; skipped: "not_configured" }
  | { ok: false; error: "telegram_error" | "network_error" };

/**
 * Send a message to the configured Telegram chat. Best-effort: returns a
 * result object instead of throwing, so callers can keep the form working even
 * when Telegram is unreachable or not configured.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // Not configured — succeed silently so the form is never blocked.
  if (!token || !chatId) {
    return { ok: false, skipped: "not_configured" };
  }

  try {
    // TELEGRAM_API_BASE exists so a test can point this at a local stub and
    // read the exact message that would have been sent. Unset everywhere
    // else, which is the real API.
    const base = process.env.TELEGRAM_API_BASE?.trim() || "https://api.telegram.org";
    const res = await fetch(`${base}/bot${token}/sendMessage`, {
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
      return { ok: false, error: "telegram_error" };
    }
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[telegram] could not reach api.telegram.org:", err);
    return { ok: false, error: "network_error" };
  }
}
