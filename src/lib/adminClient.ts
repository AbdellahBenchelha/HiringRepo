"use client";

// Must match CSRF_COOKIE in src/lib/adminAuth.ts. Kept inline so this client
// module never imports the server-only adminAuth (which pulls in node:crypto).
const CSRF_COOKIE = "wr_admin_csrf";

/** Read the CSRF token the server set as a readable cookie. */
export function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * POST JSON to an admin endpoint with the CSRF header attached.
 *
 * `timeoutMs`, when given, gives up rather than letting a request hang — for
 * the live chat, where "Sending…" that never resolves is worse than an honest
 * "Not sent — try again".
 */
export async function adminPost(url: string, body: unknown, timeoutMs?: number): Promise<Response> {
  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken() },
      body: JSON.stringify(body ?? {}),
      signal: controller?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** DELETE an admin resource with the CSRF header attached. */
export async function adminDelete(url: string): Promise<Response> {
  return fetch(url, {
    method: "DELETE",
    headers: { "x-csrf-token": csrfToken() },
  });
}
