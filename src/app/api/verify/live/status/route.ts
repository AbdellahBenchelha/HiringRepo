import { NextRequest, NextResponse } from "next/server";
import { readLiveVerifyToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Is this candidate's verification ready yet?
 *
 * Asked every few seconds by the waiting page, which is shown while the
 * provider session behind somebody's link is dead and a recruiter is fetching
 * a fresh one. The moment they paste it, this answers "ready" and the page
 * turns itself into the real thing — a candidate told to wait one to three
 * minutes must not also have to know to press reload.
 *
 * Its own route rather than the POST beside it, for the rate limit: that one
 * allows thirty requests in ten minutes because it is called twice in a
 * session, and a page polling for three minutes would be cut off halfway
 * through with no way to say so.
 *
 * Answers a single boolean and nothing else. The provider link is deliberately
 * not in the reply — while somebody is held there is nothing worth sending,
 * and once they are not the page fetches it the way it always did.
 */

export const runtime = "nodejs";

// Generous, because this is one candidate's own page checking on itself: a
// poll every five seconds for twenty minutes is 240, and nobody should be
// stopped mid-wait by a limit meant for something else.
const MAX_REQUESTS = 400;
const WINDOW_MS = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const limit = rateLimit(`live-status:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "verify/live/status");

  const token = readLiveVerifyToken(req.nextUrl.searchParams.get("t"));
  // An unreadable token is not something a candidate can act on, and the page
  // it came from already says so. Held is the safe answer: it leaves them
  // waiting rather than sending them anywhere.
  if (!token.ok) return NextResponse.json({ ok: true, held: true });

  try {
    const candidate = await getCandidate(token.link.id);
    if (!candidate) return NextResponse.json({ ok: true, held: true });
    // A newer check has been emailed, so this link is not the current one.
    // Reloading is still the right move: the page will explain that.
    if (candidate.liveVerificationSentAt !== token.link.sentAt) {
      return NextResponse.json({ ok: true, held: false, stale: true });
    }
    return NextResponse.json({ ok: true, held: !!candidate.liveVerificationHeldAt });
  } catch {
    // Keep them waiting rather than sending them to a session we could not
    // read the state of.
    return NextResponse.json({ ok: true, held: true });
  }
}
