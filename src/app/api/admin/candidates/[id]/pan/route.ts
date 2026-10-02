import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { clearPanDocuments, getCandidate, recordPanReupload, revertPanReupload } from "@/lib/store";
import { deleteObjects } from "@/lib/r2";
import { sendEmail } from "@/lib/email";
import { panReuploadHtml, panReuploadSubject, panReuploadText } from "@/lib/emailTemplates";
import { panReuploadMessage } from "@/lib/pan";
import { PAN_REUPLOAD_TTL_DAYS, createPanReuploadToken } from "@/lib/token";
import { campaignBlocked } from "@/lib/warmupStore";
import { siteConfig } from "@/config/site";

/**
 * Recruiter actions on a candidate's PAN card:
 *
 *   clear             delete both sides from storage, keep that they said they had one
 *   request-reupload  email them a personal link to send a new photo of the
 *                     physical card, front and back — see lib/pan
 */

export const runtime = "nodejs";

/** Below this, a second request is refused as a double click. */
const MIN_GAP_MS = 60_000;

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const by = session?.u ?? "admin";
  const { id } = await ctx.params;

  let body: { action?: string; reason?: unknown; custom?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "clear") {
    const keys = await clearPanDocuments(id);
    if (keys.length) await deleteObjects(keys).catch(() => {});
    const updated = await getCandidate(id);
    // eslint-disable-next-line no-console
    console.log(`[pan] ${id} PAN card cleared by ${by} (${keys.length})`);
    return NextResponse.json({ ok: true, removed: keys.length, panDeletedAt: updated?.panDeletedAt });
  }

  if (body.action === "request-reupload") {
    const reason = panReuploadMessage(
      typeof body.reason === "string" ? body.reason : "",
      typeof body.custom === "string" ? body.custom : "",
    );
    if (!reason) return NextResponse.json({ ok: false, error: "no_reason" }, { status: 400 });
    if (!candidate.offerAcceptedAt) return NextResponse.json({ ok: false, error: "not_accepted" }, { status: 409 });
    const email = (candidate.email || "").trim();
    if (!email.includes("@")) return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
    const last = candidate.panReuploadRequestedAt;
    if (last && Date.now() - Date.parse(last) < MIN_GAP_MS) {
      return NextResponse.json({ ok: false, error: "too_soon" }, { status: 409 });
    }
    if (await campaignBlocked()) {
      return NextResponse.json({ ok: false, error: "warmup_limit" }, { status: 429 });
    }

    // Recorded first: the link is checked against it, and somebody who opens
    // the email at once must find it.
    const at = new Date().toISOString();
    const updated = await recordPanReupload(id, { at, by, reason });
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const url = `${baseUrl(req)}/pan?t=${encodeURIComponent(createPanReuploadToken({ id, sentAt: at }))}`;
    const payload = { fullName: candidate.fullName || "Candidate", url, reason, validDays: PAN_REUPLOAD_TTL_DAYS };
    const result = await sendEmail({
      to: email,
      toName: candidate.fullName || undefined,
      subject: panReuploadSubject(),
      html: panReuploadHtml(payload),
      text: panReuploadText(payload),
      replyTo: siteConfig.contact.recruitmentEmail,
      kind: "campaign",
    });
    if (!result.ok) {
      await revertPanReupload(id, at);
      const why = "skipped" in result ? result.skipped : result.error;
      // eslint-disable-next-line no-console
      console.warn(`[pan] re-upload request for ${id} not sent: ${why}`);
      return NextResponse.json({ ok: false, error: why }, { status: 502 });
    }
    // eslint-disable-next-line no-console
    console.log(`[pan] re-upload requested from ${id} by ${by}`);
    return NextResponse.json({
      ok: true,
      panReuploadRequestedAt: updated.panReuploadRequestedAt,
      panReuploadReason: updated.panReuploadReason,
      panReuploadRequests: updated.panReuploadRequests,
    });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
