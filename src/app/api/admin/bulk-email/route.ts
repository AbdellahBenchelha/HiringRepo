import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import {
  BULK_ACTIONS,
  DEFAULT_PACE_SECONDS,
  MAX_BATCH,
  eligibility,
  isPace,
  type BatchItem,
  type BatchState,
  type BulkAction,
} from "@/lib/bulkEmail";
import { clearBatch, readBatch, startBatch } from "@/lib/bulkEmailStore";
import { offerProblems, ENGAGEMENT_TYPES, type Offer } from "@/lib/offer";
import { ensureWorker } from "@/lib/bulkEmailWorker";
import { checkAgainstCap } from "@/lib/warmup";
import { currentAllowance } from "@/lib/warmupStore";

/**
 * Start a paced batch, or read how the current one is doing.
 *
 * The eligibility rules run again here. The selection bar shows the recruiter
 * who is in and who is out before they press, but that is a courtesy — this is
 * where it is decided, because the list of ids arrives from a browser and the
 * consequence of getting it wrong is a real message in a real inbox.
 *
 * GET is the panel's poll. It is deliberately cheap: one small file, no
 * candidate records, and no work started as a side effect of reading.
 */

export const runtime = "nodejs";

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * One candidate's terms, or nothing.
 *
 * The same shape and the same validation the single-offer route applies. A
 * batch that trusted the browser would be the one way to get an unchecked
 * figure into a real offer email.
 */
function readOffer(raw: unknown): Offer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const offer: Offer = {
    position: typeof o.position === "string" ? o.position.trim() : "",
    rate: num(o.rate) ?? 0,
    currency: typeof o.currency === "string" ? o.currency.trim().toUpperCase() : "",
    unit: o.unit as Offer["unit"],
    hoursPerWeek: num(o.hoursPerWeek),
    startDate: typeof o.startDate === "string" && o.startDate ? o.startDate : undefined,
    engagement: o.engagement as Offer["engagement"],
    probation: undefined,
    note: undefined,
  };
  if (offerProblems(offer).length) return null;
  if (!ENGAGEMENT_TYPES.includes(offer.engagement)) return null;
  return offer;
}

export async function GET() {
  // Reading takes a session but no CSRF token: it changes nothing, and the
  // panel polls it every couple of seconds.
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const batch = await readBatch();
  // The allowance rides along with the poll the panel already makes, so the
  // selection bar can say what is left before anyone presses send rather than
  // only after being refused.
  return NextResponse.json({ ok: true, batch, allowance: await currentAllowance() });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = await readJsonBody<{
    action?: string;
    ids?: unknown;
    paceSeconds?: unknown;
    /** For an offer batch: this person's terms, by candidate id. */
    offers?: Record<string, unknown>;
    /** The warm-up warning was shown and the operator chose to send anyway. */
    override?: unknown;
    // Room for MAX_BATCH sets of terms with the position typed out in full,
    // several times over. Still a limit, because this reads a request body.
  }>(req, 128 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const action = parsed.data.action as BulkAction;
  if (!BULK_ACTIONS.includes(action)) {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  const ids = Array.isArray(parsed.data.ids)
    ? [...new Set(parsed.data.ids.filter((v): v is string => typeof v === "string"))]
    : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "nobody_selected" }, { status: 400 });
  if (ids.length > MAX_BATCH) {
    return NextResponse.json({ ok: false, error: "too_many", max: MAX_BATCH }, { status: 400 });
  }

  const paceSeconds = isPace(parsed.data.paceSeconds)
    ? (parsed.data.paceSeconds as number)
    : DEFAULT_PACE_SECONDS;

  const items: BatchItem[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const id of ids) {
    const c = await getCandidate(id);
    if (!c) {
      skipped.push({ name: id, reason: "no longer on file" });
      continue;
    }
    const name = c.fullName || c.email || id;
    const verdict = eligibility(action, {
      id,
      fullName: c.fullName,
      email: c.email,
      interviewCompleted: !!c.interview,
      interviewEmailSentAt: c.interviewEmailSentAt,
      voiceRequestedAt: c.voiceRequestedAt,
      documents: c.documents,
      voiceStatus: c.voiceStatus,
      voiceAckSentAt: c.voiceAckSentAt,
      offerSentAt: c.offerSentAt,
      offerAcceptedAt: c.offerAcceptedAt,
      offerDeclinedAt: c.offerDeclinedAt,
      offerReminderCount: c.offerReminderCount,
      voiceStatusForOffer: c.voiceStatus,
    });
    if (!verdict.include) {
      skipped.push({ name, reason: verdict.reason });
      continue;
    }

    // An offer is the one action whose message differs per person, so the
    // terms travel with the item — and are validated here rather than taken on
    // trust, because they arrive from a browser and end up in a contract.
    if (action === "offer") {
      const terms = readOffer((parsed.data.offers ?? {})[id]);
      if (!terms) {
        skipped.push({ name, reason: "the terms sent for them were not valid" });
        continue;
      }
      items.push({ id, name, email: c.email, state: "pending", offer: terms });
      continue;
    }

    items.push({ id, name, email: c.email, state: "pending" });
  }

  if (!items.length) {
    return NextResponse.json({ ok: false, error: "nobody_eligible", skipped }, { status: 400 });
  }

  // Checked here, against the eligible list rather than the selected one: the
  // number that matters is how many messages would actually leave, and telling
  // someone a batch is over the limit when half of it was going to be skipped
  // anyway would train them to press through the warning.
  const override = parsed.data.override === true;
  const allowance = await currentAllowance();
  const cap = checkAgainstCap(items.length, allowance);
  if (cap.wouldExceed && !override) {
    return NextResponse.json(
      { ok: false, error: "warmup_limit", allowance, wouldSend: items.length, skipped },
      { status: 409 },
    );
  }

  const session = await getAdminSession();
  const batch: BatchState = {
    id: `b${Date.now().toString(36)}`,
    action,
    paceSeconds,
    createdAt: new Date().toISOString(),
    startedBy: session?.u,
    status: "running",
    items,
    // Only recorded when it changes what happens. A batch that fits inside
    // today's allowance carries no override, whatever the browser sent.
    override: override && cap.wouldExceed ? true : undefined,
  };

  const started = await startBatch(batch);
  if (!started.ok) {
    return NextResponse.json(
      { ok: false, error: started.error, batch: started.batch },
      { status: 409 },
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[bulk] ${action} to ${items.length} candidate(s), ${paceSeconds}s apart` +
      `${skipped.length ? `, ${skipped.length} skipped` : ""}`,
  );
  void ensureWorker();

  return NextResponse.json({ ok: true, batch: started.batch, skipped });
}

/** Throw away a finished batch, so the panel goes back to the plain toolbar. */
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const cleared = await clearBatch();
  if (!cleared) return NextResponse.json({ ok: false, error: "still_running" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
