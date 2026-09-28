/**
 * fetch, with a limit on how long it may hang.
 *
 * A poll on a phone that has just lost its signal can sit unanswered for
 * minutes before the browser gives up — and a page waiting on it shows
 * nothing new and no sign that anything is wrong. This gives up first, so the
 * page can say it is reconnecting and try again.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  ms = 12_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
