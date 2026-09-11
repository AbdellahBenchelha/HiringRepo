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
import { ensureWorker } from "@/lib/bulkEmailWorker";

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

export async function GET() {
  // Reading takes a session but no CSRF token: it changes nothing, and the
  // panel polls it every couple of seconds.
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const batch = await readBatch();
  return NextResponse.json({ ok: true, batch });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = await readJsonBody<{ action?: string; ids?: unknown; paceSeconds?: unknown }>(
    req,
    32 * 1024,
  );
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
    });
    if (!verdict.include) {
      skipped.push({ name, reason: verdict.reason });
      continue;
    }
    items.push({ id, name, email: c.email, state: "pending" });
  }

  if (!items.length) {
    return NextResponse.json({ ok: false, error: "nobody_eligible", skipped }, { status: 400 });
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
