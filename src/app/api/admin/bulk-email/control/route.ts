import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { readBatch, setStatus } from "@/lib/bulkEmailStore";
import { ensureWorker, stopWorker } from "@/lib/bulkEmailWorker";
import { isFinished } from "@/lib/bulkEmail";

/**
 * Pause, resume or stop the batch that is running.
 *
 * Stopping leaves the record standing rather than deleting it: half of a batch
 * has been emailed by then, and "who did this actually reach before I stopped
 * it" is the only question worth asking afterwards.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsed = await readJsonBody<{ command?: string }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const command = parsed.data.command;

  const current = await readBatch();
  if (!current) return NextResponse.json({ ok: false, error: "no_batch" }, { status: 404 });
  if (isFinished(current) && command !== "cancel") {
    return NextResponse.json({ ok: false, error: "finished" }, { status: 409 });
  }

  if (command === "pause") {
    stopWorker();
    const batch = await setStatus("paused");
    return NextResponse.json({ ok: true, batch });
  }
  if (command === "resume") {
    const batch = await setStatus("running");
    void ensureWorker();
    return NextResponse.json({ ok: true, batch });
  }
  if (command === "cancel") {
    stopWorker();
    const batch = await setStatus("cancelled");
    // eslint-disable-next-line no-console
    console.log(`[bulk] batch ${current.id} cancelled`);
    return NextResponse.json({ ok: true, batch });
  }

  return NextResponse.json({ ok: false, error: "bad_command" }, { status: 400 });
}
