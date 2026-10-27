import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, setGstinByRecruiter } from "@/lib/store";
import { isValidGstin, normaliseGstin } from "@/lib/pan";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { sendGstinRequestEmail, sendGstinWaitingEmail } from "@/lib/gstinSend";

/**
 * A candidate's GSTIN, from View info.
 *
 *   POST { action: "request" }        email "GSTIN needed" (India, accepted, no GSTIN)
 *   POST { action: "set", gstin }     save one a candidate sent by reply (checked first)
 *   POST { action: "waiting" }        email "your place is waiting — send us your GSTIN
 *                                     when ready" (India, accepted, no GSTIN)
 *
 * Both emails are sent by lib/gstinSend, shared with the Accepted tab's bulk
 * buttons, and recorded only once the email has actually gone.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  const parsed = await readJsonBody<{ action?: string; gstin?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "set") {
    const gstin = normaliseGstin(body.gstin);
    if (!isValidGstin(gstin)) {
      return NextResponse.json({ ok: false, error: "invalid_gstin" }, { status: 400 });
    }
    const updated = await setGstinByRecruiter(id, gstin, by);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[gstin] ${id} GSTIN set by ${by}`);
    return NextResponse.json({
      ok: true,
      gstin: updated.gstin,
      gstinAddedAt: updated.gstinAddedAt,
      gstinAddedBy: updated.gstinAddedBy,
    });
  }

  if (body.action === "request") {
    const result = await sendGstinRequestEmail(id, { by });
    if (!result.ok) {
      const status =
        result.reason === "not_found" ? 404 : result.reason === "warmup_limit" ? 429 : result.reason === "no_email" ? 400 : 409;
      return NextResponse.json({ ok: false, error: result.reason }, { status });
    }
    return NextResponse.json({ ok: true, gstinRequests: result.candidate.gstinRequests ?? [] });
  }

  if (body.action === "waiting") {
    const result = await sendGstinWaitingEmail(id, { by });
    if (!result.ok) {
      const status =
        result.reason === "not_found" ? 404 : result.reason === "warmup_limit" ? 429 : result.reason === "no_email" ? 400 : 409;
      return NextResponse.json({ ok: false, error: result.reason }, { status });
    }
    return NextResponse.json({ ok: true, gstinWaitingEmails: result.candidate.gstinWaitingEmails ?? [] });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
