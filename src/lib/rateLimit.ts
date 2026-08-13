/**
 * SERVER-ONLY in-process rate limiting.
 *
 * A fixed-window counter held in memory. This is deliberately simple: the app
 * runs as a single Node process, so a shared store would be extra moving parts
 * for no gain. Two consequences worth knowing:
 *   - Counters reset when the process restarts (a deploy clears them).
 *   - If you ever scale to more than one instance, each keeps its own counters,
 *     so the effective limit multiplies by the instance count. At that point
 *     move this to Redis or your host's edge rate limiting.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound the map so a flood of unique keys can't grow it without limit.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}

/**
 * Best-effort client IP. Behind a proxy (Railway, Fly, Vercel, nginx) the real
 * address is in x-forwarded-for; the first entry is the original client.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when ok is false. */
  retryAfter: number;
}

/**
 * Count one hit against `key`. Returns ok:false once `limit` is exceeded
 * within `windowMs`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Standard 429 response carrying Retry-After.
 *
 * Always logs. Some callers reach these routes through navigator.sendBeacon,
 * which discards the response — without a server-side line, a dropped request
 * is invisible from both ends.
 */
export function tooManyRequests(retryAfter: number, label?: string): Response {
  // eslint-disable-next-line no-console
  console.warn(
    `[ratelimit] rejected${label ? ` ${label}` : ""}; retry in ${retryAfter}s`,
  );
  return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}
