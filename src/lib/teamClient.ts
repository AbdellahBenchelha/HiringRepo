"use client";

// Must match TEAM_CSRF_COOKIE in src/lib/teamAuth.ts. Inline so this client
// module never pulls in the server-only session code.
const CSRF_COOKIE = "wr_team_csrf";

function csrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * POST JSON to a team portal endpoint, with the CSRF header. `keepalive` lets
 * it finish even if the page is left straight after.
 */
export function teamPost(url: string, body: unknown, opts: { keepalive?: boolean } = {}): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": csrf() },
    body: JSON.stringify(body ?? {}),
    keepalive: opts.keepalive,
  });
}

/** POST a form (with files) to a team portal endpoint. */
export function teamForm(url: string, form: FormData): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "x-csrf-token": csrf() }, body: form });
}

/** The first problem a failed response explains, or a fallback. */
export async function problemOf(res: Response, fallback = "Something went wrong. Please try again."): Promise<string> {
  try {
    const data = (await res.json()) as { problems?: string[]; message?: string };
    return data.problems?.[0] || data.message || fallback;
  } catch {
    return fallback;
  }
}
