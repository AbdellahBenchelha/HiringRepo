import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordOfferReminder } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  offerReminderHtml,
  offerReminderSubject,
  offerReminderText,
} from "@/lib/emailTemplates";
import { effectiveOffer, formatRate } from "@/lib/offer";
import { deadlineFrom, formatDeadline, offerAwaitingReply } from "@/lib/offerReminder";
import { createOfferToken } from "@/lib/token";
import { siteConfig } from "@/config/site";

/**
 * Chase an answer to an offer, with a deadline.
 *
 * An offer nobody has answered is the most expensive silence in the process:
 * the role is held open, nobody else is put forward for it, and the candidate
 * may simply have taken another job and not thought to say so.
 *
 * Refused for anybody who has already answered. Telling somebody who accepted
 * on Tuesday that we are about to delete them is how a signed candidate is
 * lost, and it is the mistake this guard exists to make impossible.
 *
 * Nothing here deletes anything. The deadline is recorded and the Interviews
 * tab flags it once it passes; erasing a person stays a decision somebody
 * makes in front of the record, with no undo and therefore no automation.
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

  if (!candidate.offerSentAt) {
    return NextResponse.json({ ok: false, error: "no_offer" }, { status: 409 });
  }
  if (!offerAwaitingReply(candidate)) {
    return NextResponse.json({ ok: false, error: "already_answered" }, { status: 409 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // Fixed before the send so the email and the record name the same moment.
  const sentAt = new Date().toISOString();
  const deadline = deadlineFrom(sentAt);

  // Their existing offer link. It still opens the accept and decline buttons,
  // and it is the link they have already been sent — a reminder pointing
  // somewhere new is a reminder that looks like somebody else's email.
  const token = createOfferToken({ id, offerSentAt: candidate.offerSentAt });
  const offer = candidate.offer ? effectiveOffer(candidate.offer) : undefined;
  const invite = {
    fullName: candidate.fullName || "Candidate",
    position: offer?.position || candidate.position || undefined,
    rate: offer ? formatRate(offer) : undefined,
    offerUrl: `${baseUrl(req)}/offer?t=${encodeURIComponent(token)}`,
    deadline: formatDeadline(deadline),
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: offerReminderSubject(invite.position),
    html: offerReminderHtml(invite),
    text: offerReminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[offer] reminder not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await recordOfferReminder(id, sentAt);
  // eslint-disable-next-line no-console
  console.log(`[offer] reply chased from ${email} (${updated?.offerReminderCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    offerReminderSentAt: updated?.offerReminderSentAt,
    offerReminderCount: updated?.offerReminderCount,
    offerReminders: updated?.offerReminders,
    offerReplyDeadline: updated?.offerReplyDeadline,
  });
}
