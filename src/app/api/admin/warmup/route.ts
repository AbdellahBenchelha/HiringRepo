import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildWarmupStats } from "@/lib/warmupStats";
import { clearFeedback, setDailyCap, stepDownStage, stepUpStage } from "@/lib/warmupStore";
import { WARMUP_STAGES } from "@/lib/warmup";

/**
 * Read the warm-up's state, or change the cap.
 *
 * GET is the tab's refresh: a session but no CSRF token, because it changes
 * nothing. POST takes both.
 */

export const runtime = "nodejs";

/**
 * The most the cap may be set to by hand.
 *
 * Twice the top of the curve. Not a safety rail against a determined operator
 * — they can press the override on any batch — but enough that a slipped digit
 * cannot turn twenty into twenty thousand and empty the whole list in an
 * afternoon.
 */
const MAX_MANUAL_CAP = WARMUP_STAGES[WARMUP_STAGES.length - 1].cap * 2;

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, stats: await buildWarmupStats() });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = await readJsonBody<{ action?: unknown; cap?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  switch (parsed.data.action) {
    case "stepUp":
      await stepUpStage();
      break;
    case "stepDown":
      await stepDownStage();
      break;
    // Sends are untouched: see clearFeedback. This only forgets what the
    // webhook reported, which is the only part that can be wrong.
    case "clearFeedback":
      await clearFeedback();
      break;
    case "setCap": {
      const cap = parsed.data.cap;
      if (typeof cap !== "number" || !Number.isFinite(cap) || cap < 1 || cap > MAX_MANUAL_CAP) {
        return NextResponse.json(
          { ok: false, error: "bad_cap", max: MAX_MANUAL_CAP },
          { status: 400 },
        );
      }
      await setDailyCap(cap);
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, stats: await buildWarmupStats() });
}
