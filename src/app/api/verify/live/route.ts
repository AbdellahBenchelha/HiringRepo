import { NextRequest, NextResponse } from "next/server";
import { readLiveVerifyToken } from "@/lib/token";
import {
  getCandidate,
  recordLiveVerificationOpened,
  recordLiveVerificationStarted,
} from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildLiveCheckStartedMessage, sendTelegramMessage } from "@/lib/telegram";
import { providerFor } from "@/lib/liveVerification";

/**
 * Records that a candidate opened their live-check page, or pressed through to
 * the provider from it.
 *
 * Called from the browser once the page has rendered, never during the server
 * render: an email link is fetched by mail scanners and link previews before
 * any person sees it, and a page that counted those would report every
 * candidate as having opened their check within seconds of it being sent.
 *
 * Identified by the signed token rather than a candidate id, so the id never
 * has to appear in a page a candidate can read.
 *
 * Always answers ok. The caller cannot act on a failure, and a candidate must
 * never see an error for a piece of our bookkeeping.
 */

export const runtime = "nodejs";

const MAX_REQUESTS = 30;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Tell the recruiter somebody has just gone through to the provider.
 *
 * Deliberately not awaited by the handler. The browser waits for this request
 * before it sends the candidate on to the provider, so anything slow in here
 * is a candidate watching a button say "Opening…" — and a notification is
 * never worth standing between somebody and the check we asked them to do.
 *
 * The quiet-hours setting does not apply: it silences the messages that come
 * before the assessment, and nobody is sent a live check until long after it.
 */
async function announceStart(id: string): Promise<void> {
  try {
    const c = await getCandidate(id);
    if (!c) return;
    const name = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ");
    await sendTelegramMessage(
      buildLiveCheckStartedMessage(
        name,
        c.email,
        c.country,
        c.liveVerificationUrl ? providerFor(c.liveVerificationUrl) : null,
      ),
    );
  } catch {
    /* a notification must never become an error the candidate can see */
  }
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`live-verify:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "verify/live");

  const parsed = await readJsonBody<{ t?: string; phase?: string }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const token = readLiveVerifyToken(parsed.data.t);
  if (!token.ok) return NextResponse.json({ ok: true });

  const phase = parsed.data.phase === "started" ? "started" : "opened";
  try {
    const first =
      phase === "started"
        ? await recordLiveVerificationStarted(token.link.id)
        : await recordLiveVerificationOpened(token.link.id);
    if (first) {
      // eslint-disable-next-line no-console
      console.log(`[live-verify] ${token.link.id} ${phase} their check`);
      // Only the handover, and only the first time — which is what `first`
      // already means here. A re-sent check clears the mark, so a second link
      // genuinely being started does say so again.
      if (phase === "started") void announceStart(token.link.id);
    }
  } catch {
    /* bookkeeping only */
  }
  return NextResponse.json({ ok: true });
}
