import { NextRequest, NextResponse } from "next/server";
import { recordInterviewOpened } from "@/lib/store";
import { isOpenSource } from "@/lib/followUp";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Marks an assessment as opened.
 *
 * Called from the browser once the assessment page has rendered, rather than
 * during the server render. Pasting the link into WhatsApp or Telegram makes
 * those services fetch the URL to build a link preview; recording on the
 * server would count that as the candidate opening it. Preview bots do not run
 * JavaScript, so this only fires for a real person.
 *
 * Always answers ok — the caller cannot act on a failure and must never show
 * the candidate an error for a piece of bookkeeping.
 */

export const runtime = "nodejs";

const MAX_REQUESTS = 30;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`opened:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "interview-opened");

  const parsed = await readJsonBody<{ id?: string; source?: string }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!id) return NextResponse.json({ ok: true });

  // Anything unrecognised is dropped rather than stored: the source decides
  // what the Admin Panel claims about how a candidate got here, and it arrives
  // from a URL anyone could edit.
  const source = isOpenSource(parsed.data.source) ? parsed.data.source : undefined;

  try {
    const first = await recordInterviewOpened(id, source);
    if (first) {
      // eslint-disable-next-line no-console
      console.log(`[interview] ${id} opened the assessment${source ? ` via ${source}` : ""}`);
    }
  } catch {
    /* bookkeeping only */
  }
  return NextResponse.json({ ok: true });
}
