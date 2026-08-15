import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, claimInterviewEmail, releaseInterviewEmail } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  interviewInviteHtml,
  interviewInviteSubject,
  interviewInviteText,
} from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";

/**
 * Send a candidate their assessment link by hand.
 *
 * This is the release valve for an application flagged as a possible
 * duplicate: its email is withheld on submit so a recruiter can compare the
 * two records first, and this endpoint sends it once they decide to proceed.
 * It also covers a candidate who never received the automatic email.
 */

export const runtime = "nodejs";

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

  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // Same claim the automatic path uses, so a double click cannot send twice.
  const claimed = await claimInterviewEmail(id);
  if (!claimed) {
    return NextResponse.json(
      { ok: false, error: "already_sent", interviewEmailSentAt: candidate.interviewEmailSentAt },
      { status: 409 },
    );
  }

  const position = candidate.position || undefined;
  const invite = {
    fullName: candidate.fullName || "Candidate",
    interviewUrl: `${baseUrl(req)}/interview?c=${id}`,
    position,
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: interviewInviteSubject(position),
    html: interviewInviteHtml(invite),
    text: interviewInviteText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    // Hand the claim back so the recruiter can try again.
    await releaseInterviewEmail(id).catch(() => {});
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[admin] assessment email not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await getCandidate(id);
  return NextResponse.json({ ok: true, interviewEmailSentAt: updated?.interviewEmailSentAt });
}
