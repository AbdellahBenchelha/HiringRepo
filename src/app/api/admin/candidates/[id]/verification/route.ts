import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import {
  clearVerificationImages,
  requestIdentityReupload,
  requestVerification,
  setVerificationDecision,
  type Candidate,
} from "@/lib/store";
import { deleteObjects } from "@/lib/r2";
import { sendEmail } from "@/lib/email";
import {
  identityReuploadHtml,
  identityReuploadSubject,
  identityReuploadText,
  verificationRequestHtml,
  verificationRequestSubject,
  verificationRequestText,
} from "@/lib/emailTemplates";
import { reuploadMessage } from "@/lib/verification";
import { createOfferToken } from "@/lib/token";
import { siteConfig } from "@/config/site";

/**
 * Recruiter actions on a candidate's identity verification.
 *
 *   verify / reject   record the decision
 *   request           ask someone whose country does not require it
 *   reupload          ask again, with a reason, when what arrived is no good
 *   clear-images      forget the photographs, keep the decision
 *
 * `request` and `reupload` are separate actions rather than one that guesses
 * which it is. They ask different people — one who has sent nothing and one
 * whose documents were refused — and get the wording, the reason and the
 * record wrong if they are conflated.
 *
 * Clearing is a separate action and never automatic: deciding when the images
 * are no longer needed is a judgement, and a rule that deleted them on a timer
 * would eventually delete one somebody still wanted.
 */

export const runtime = "nodejs";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Where to send someone to take the photographs again.
 *
 * Their offer link when they have a live offer, because that is the page they
 * are actually on: the assessment link shows an accepted candidate a
 * confirmation that their assessment is finished, with no way through to an
 * upload. The offer page resumes the identity step for anyone who still owes
 * one, which a pending re-request makes true.
 *
 * The assessment link otherwise — anyone earlier in the process reaches the
 * upload there, and it is a link they have already used and have reason to
 * trust.
 */
function uploadUrlFor(c: Candidate, base: string): string {
  if (c.offerSentAt && c.offer) {
    const token = createOfferToken({ id: c.id, offerSentAt: c.offerSentAt });
    return `${base}/offer?t=${encodeURIComponent(token)}`;
  }
  return `${base}/interview?c=${c.id}`;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const { id } = await ctx.params;

  let body: { action?: string; reason?: string; customReason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const by = session?.u ?? "admin";

  if (body.action === "verify" || body.action === "reject") {
    const updated = await setVerificationDecision(
      id,
      body.action === "verify" ? "verified" : "rejected",
      by,
      typeof body.reason === "string" ? body.reason : undefined,
    );
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[verification] ${id} ${body.action}ed by ${by}`);
    return NextResponse.json({
      ok: true,
      verifiedAt: updated.verifiedAt,
      rejectedAt: updated.rejectedAt,
      rejectionReason: updated.rejectionReason,
      verifiedBy: updated.verifiedBy,
    });
  }

  if (body.action === "request") {
    const updated = await requestVerification(id);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[verification] ${id} verification requested by ${by}`);

    // Someone asked by hand is, by definition, someone whose country does not
    // trigger this — so they have no reason to revisit their link and would
    // never discover the request on their own. Tell them.
    const email = (updated.email || "").trim();
    let emailed = false;
    let emailError: string | undefined;
    if (email.includes("@")) {
      const invite = {
        fullName: updated.fullName || "Candidate",
        interviewUrl: `${baseUrl(req)}/interview?c=${id}`,
        position: updated.position || undefined,
      };
      const result = await sendEmail({
        to: email,
        toName: updated.fullName || undefined,
        subject: verificationRequestSubject(),
        html: verificationRequestHtml(invite),
        text: verificationRequestText(invite),
        replyTo: siteConfig.contact.recruitmentEmail,
      });
      emailed = result.ok;
      if (!result.ok) {
        emailError = "skipped" in result ? result.skipped : result.error;
        // The request itself is recorded either way — a mail failure must not
        // silently undo it — but the recruiter has to know nobody was told.
        // eslint-disable-next-line no-console
        console.warn(`[verification] ${id} requested but email not sent: ${emailError}`);
      }
    } else {
      emailError = "no_email";
    }

    return NextResponse.json({
      ok: true,
      verificationRequestedAt: updated.verificationRequestedAt,
      emailed,
      emailError,
    });
  }

  if (body.action === "reupload") {
    const message = reuploadMessage(body.reason ?? "", body.customReason);
    if (!message) {
      return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 });
    }

    const updated = await requestIdentityReupload(id, message);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[verification] ${id} re-upload requested by ${by} (${body.reason ?? "custom"})`);

    // The record is what makes the upload step reappear; the email is what
    // makes anyone look at it. A candidate who is not told has been asked in
    // a room with nobody in it.
    const email = (updated.email || "").trim();
    let emailed = false;
    let emailError: string | undefined;
    if (email.includes("@")) {
      const payload = {
        fullName: updated.fullName || "Candidate",
        url: uploadUrlFor(updated, baseUrl(req)),
        reason: message,
      };
      const result = await sendEmail({
        to: email,
        toName: updated.fullName || undefined,
        subject: identityReuploadSubject(),
        html: identityReuploadHtml(payload),
        text: identityReuploadText(payload),
        replyTo: siteConfig.contact.recruitmentEmail,
      });
      emailed = result.ok;
      if (!result.ok) {
        emailError = "skipped" in result ? result.skipped : result.error;
        // eslint-disable-next-line no-console
        console.warn(`[verification] ${id} re-upload asked but email not sent: ${emailError}`);
      }
    } else {
      emailError = "no_email";
    }

    return NextResponse.json({
      ok: true,
      identityReuploadRequestedAt: updated.identityReuploadRequestedAt,
      identityReuploadReason: updated.identityReuploadReason,
      verificationRequestedAt: updated.verificationRequestedAt,
      emailed,
      emailError,
    });
  }

  if (body.action === "clear-images") {
    const keys = await clearVerificationImages(id);
    if (keys.length) await deleteObjects(keys);
    // eslint-disable-next-line no-console
    console.log(`[verification] ${id} images cleared by ${by} (${keys.length} file(s))`);
    return NextResponse.json({ ok: true, removed: keys.length });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
