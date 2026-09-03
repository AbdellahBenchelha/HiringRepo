import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { dayKey, hourOf } from "@/lib/analytics";
import { recordView, attributeCountry, currentSalt } from "@/lib/analyticsStore";
import { visitorId } from "@/lib/visitorId";
import { isBot, deviceOf, sourceOf, normalisePath } from "@/lib/trackRequest";
import { detectCountryFromRequest } from "@/lib/geoServer";
import { siteConfig } from "@/config/site";

/**
 * Counts one page view.
 *
 * Public, because it is the site's own visitors calling it. That means it can
 * be called with anything, so nothing it is told is trusted: the path is
 * validated, and the address, browser, and country are read from the request
 * itself rather than taken from the body.
 *
 * It always answers 204, immediately, whatever happened. A visitor is never
 * shown an error from a counter, and never waits on one — the browser sends
 * this and forgets it.
 */

export const runtime = "nodejs";

/**
 * Generous, because this is per page view and someone can legitimately click
 * through twenty job listings in a couple of minutes. It exists to stop the
 * endpoint being used to inflate the numbers, not to police reading.
 */
const MAX_PER_IP = 240;
const WINDOW_MS = 5 * 60 * 1000;

/**
 * A day's budget for country lookups.
 *
 * Only a visitor's first view of the day spends one, so this is a ceiling on
 * distinct visitors, not on traffic — and it stops a flood turning into a
 * flood of outbound requests to somebody else's service.
 */
const MAX_LOOKUPS_PER_DAY = 2000;
let lookupDay = "";
let lookupCount = 0;

/** Countries already resolved today, by visitor id, so nobody is looked up twice. */
const countryCache = new Map<string, string>();

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`track:${ip}`, MAX_PER_IP, WINDOW_MS).ok) {
    return new NextResponse(null, { status: 204 });
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return new NextResponse(null, { status: 204 });

  let body: { p?: unknown; r?: unknown };
  try {
    body = (await req.json()) as { p?: unknown; r?: unknown };
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = normalisePath(typeof body.p === "string" ? body.p : "");
  if (!path) return new NextResponse(null, { status: 204 });

  const at = new Date();
  const day = dayKey(at);
  const salt = await currentSalt();
  const visitor = visitorId(salt, ip, userAgent);

  const { firstToday } = await recordView({
    at,
    hour: hourOf(at),
    path,
    // Left blank here and filled in below: knowing the country means asking
    // someone else, and a page view must not wait on that.
    country: countryCache.get(visitor) ?? "",
    referrer: sourceOf(typeof body.r === "string" ? body.r : "", new URL(siteConfig.url).hostname),
    device: deviceOf(userAgent),
    visitor,
  });

  // Only the first view of the day, and only when we do not already know.
  if (firstToday && !countryCache.has(visitor)) {
    if (lookupDay !== day) {
      lookupDay = day;
      lookupCount = 0;
      countryCache.clear();
    }
    if (lookupCount < MAX_LOOKUPS_PER_DAY) {
      lookupCount += 1;
      // Not awaited: the answer lands in the same day's figures whenever it
      // arrives, and the visitor is not kept waiting for it.
      void detectCountryFromRequest(req)
        .then((origin) => {
          const name = origin?.name;
          if (!name) return;
          countryCache.set(visitor, name);
          return attributeCountry(day, name);
        })
        .catch(() => {});
    }
  }

  return new NextResponse(null, { status: 204 });
}
