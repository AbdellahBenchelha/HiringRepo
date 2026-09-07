import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordVoiceReminder } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  voiceReminderHtml,
  voiceReminderSubject,
  voiceReminderText,
} from "@/lib/emailTemplates";
import { voiceRecordingNeeded } from "@/lib/voice";
import { withSource } from "@/lib/followUp";
import { siteConfig } from "@/config/site";

/**
 * Chase a candidate whose voice recording has been asked for and not sent.
 *
 * Separate from the request itself, and deliberately does NOT touch
 * `voiceRequestedAt`. That timestamp is what decides whether the step is open,
 * measured against the newest recording on file — refreshing it here would
 * reopen the step for someone who had already answered, and the reminder would
 * become the thing that undid their work.
 *
 * Refused when nothing is outstanding. A reminder about a recording we already
 * have is worse than no reminder: it tells a candidate who did as they were
 * asked that we lost it.
 *
 * Email only. There is no WhatsApp arm here on purpose — sending links from
 * that number to people who have never saved it is what got it banned, and the
 * whole point of moving the assessment here was to stop.
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

  if (!candidate.voiceRequestedAt) {
    return NextResponse.json({ ok: false, error: "not_requested" }, { status: 409 });
  }
  if (!voiceRecordingNeeded(candidate)) {
    return NextResponse.json({ ok: false, error: "already_received" }, { status: 409 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  const invite = {
    fullName: candidate.fullName || "Candidate",
    email,
    position: candidate.position || undefined,
    // Tagged, so an open from this email is credited to it and the recruiter
    // can see whether chasing them worked.
    recordUrl: withSource(`${baseUrl(req)}/interview?c=${id}`, "reminder-email"),
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: voiceReminderSubject(),
    html: voiceReminderHtml(invite),
    text: voiceReminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[voice] reminder not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  // Counted only once the message is actually away. A count that includes
  // failures reads as "chased three times, no response" about someone who was
  // never reached at all.
  const updated = await recordVoiceReminder(id);
  // eslint-disable-next-line no-console
  console.log(`[voice] reminder sent to ${email} (${updated?.voiceReminderCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    voiceReminderSentAt: updated?.voiceReminderSentAt,
    voiceReminderCount: updated?.voiceReminderCount,
  });
}
