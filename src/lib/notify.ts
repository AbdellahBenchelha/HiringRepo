/**
 * Telegram notifications for the application form.
 *
 * These must NEVER break the application flow, so every error is swallowed.
 * The actual message is sent server-side by /api/telegram (which holds the bot
 * token).
 *
 * Delivery uses navigator.sendBeacon when available: the browser guarantees the
 * request is sent even if the page or component is navigating away — which is
 * exactly what happens on submit, when the form unmounts to show the success
 * screen and a normal fetch can be cancelled mid-flight. It falls back to a
 * keepalive fetch when sendBeacon isn't available.
 */
export type TelegramNotification =
  | { type: "submitted"; name?: string }
  | { type: "personal"; fields: Record<string, string> };

export function notifyTelegram(payload: TelegramNotification): void {
  const url = "/api/telegram";
  const body = JSON.stringify(payload);

  // Preferred path: sendBeacon survives the component unmounting.
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }

  // Fallback: keepalive fetch (also survives most navigations).
  try {
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* notifications are best-effort */
    });
  } catch {
    /* notifications are best-effort */
  }
}
