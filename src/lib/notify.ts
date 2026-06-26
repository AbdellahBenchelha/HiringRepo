/**
 * Telegram notifications for the application form.
 *
 * These must NEVER break the application flow, so every error is swallowed and
 * the returned promise always resolves. The actual message is sent server-side
 * by /api/telegram (which holds the bot token).
 *
 * The function returns a promise so callers that need the request to fully
 * reach the server before the UI navigates away (e.g. the final "submitted"
 * notification, fired right before the form unmounts) can `await` it. Callers
 * that don't care can ignore the promise — it stays fire-and-forget.
 */
export type TelegramNotification =
  | { type: "submitted" }
  | { type: "personal"; fields: Record<string, string> };

export async function notifyTelegram(payload: TelegramNotification): Promise<void> {
  try {
    await fetch("/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    /* notifications are best-effort */
  }
}
