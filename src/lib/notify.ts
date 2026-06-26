/**
 * Fire-and-forget Telegram notifications for the application form.
 *
 * These must NEVER block or break the application flow, so the request is not
 * awaited and every error is swallowed. The actual message is sent server-side
 * by /api/telegram (which holds the bot token).
 */
export type TelegramNotification =
  | { type: "submitted" }
  | { type: "personal"; fields: Record<string, string> };

export function notifyTelegram(payload: TelegramNotification): void {
  try {
    void fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* notifications are best-effort */
    });
  } catch {
    /* notifications are best-effort */
  }
}
