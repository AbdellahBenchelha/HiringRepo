import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordGstinRequest, setGstinByRecruiter } from "@/lib/store";
import { isValidGstin, normaliseGstin } from "@/lib/pan";
import { sendEmail } from "@/lib/email";
import { gstinRequestHtml, gstinRequestSubject, gstinRequestText } from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * A candidate's GSTIN, from View info.
 *
 *   POST { action: "request" }        email "GSTIN needed" — only while none is on file
 *   POST { action: "set", gstin }     save one a candidate sent by reply (checked first)
 *
 * The request is recorded only once the email has actually gone, so the panel
 * never shows a request that nobody received.
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
    if (candidate.gstin) return NextResponse.json({ ok: false, error: "already_has_gstin" }, { status: 409 });
    const email = (candidate.email || "").trim();
    if (!email.includes("@")) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });

    const payload = { fullName: candidate.confirmedDetails?.firstName || candidate.fullName || "Candidate" };
    const result = await sendEmail({
      to: email,
      toName: candidate.fullName || undefined,
      subject: gstinRequestSubject(),
      html: gstinRequestHtml(payload),
      text: gstinRequestText(payload),
      replyTo: siteConfig.contact.recruitmentEmail,
      kind: "campaign",
    });
    if (!result.ok) {
      const reason = "skipped" in result ? result.skipped : result.error;
      // eslint-disable-next-line no-console
      console.warn(`[gstin] request to ${id} not sent: ${reason}`);
      return NextResponse.json({ ok: false, error: reason }, { status: 502 });
    }
    const updated = await recordGstinRequest(id);
    // eslint-disable-next-line no-console
    console.log(`[gstin] GSTIN requested from ${id} by ${by}`);
    return NextResponse.json({ ok: true, gstinRequests: updated?.gstinRequests ?? [] });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
