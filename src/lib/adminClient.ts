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

/** POST JSON to an admin endpoint with the CSRF header attached. */
export async function adminPost(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken() },
    body: JSON.stringify(body ?? {}),
  });
}
