import { NextRequest, NextResponse } from "next/server";
import { recordInterviewOpened, recordVoiceOpened } from "@/lib/store";
import { isOpenSource } from "@/lib/followUp";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Marks an assessment, or the voice-recording step, as opened.
 *
 * Both live at /interview, so one endpoint serves both and `step` says which.
 * They are counted separately because they are weeks apart and answer
 * different questions: the assessment open says whether the invitation landed,
 * the voice open says whether the request for a recording did.
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

  const parsed = await readJsonBody<{ id?: string; source?: string; step?: string }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!id) return NextResponse.json({ ok: true });

  // Anything unrecognised is dropped rather than stored: the source decides
  // what the Admin Panel claims about how a candidate got here, and it arrives
  // from a URL anyone could edit.
  const source = isOpenSource(parsed.data.source) ? parsed.data.source : undefined;

  const step = parsed.data.step === "voice" ? "voice" : "interview";

  try {
    const first =
      step === "voice"
        ? await recordVoiceOpened(id, source)
        : await recordInterviewOpened(id, source);
    if (first) {
      const what = step === "voice" ? "the voice assessment" : "the assessment";
      // eslint-disable-next-line no-console
      console.log(`[${step}] ${id} opened ${what}${source ? ` via ${source}` : ""}`);
    }
  } catch {
    /* bookkeeping only */
  }
  return NextResponse.json({ ok: true });
}
