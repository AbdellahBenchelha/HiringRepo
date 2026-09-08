import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordLiveVerificationSent } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  liveVerificationHtml,
  liveVerificationSubject,
  liveVerificationText,
} from "@/lib/emailTemplates";
import { checkVerificationLink } from "@/lib/liveVerification";
import { createLiveVerifyToken } from "@/lib/token";
import { siteConfig } from "@/config/site";

/**
 * Email a candidate their live identity check.
 *
 * Sent by hand, one candidate at a time, with a link the recruiter created for
 * that person in Persona. Nothing here runs on a schedule and nothing sends
 * itself: the decision that photographs were not enough is a human one.
 *
 * The link is checked again on this side. The form checks it so the recruiter
 * is told immediately, but this is the check that matters — the endpoint takes
 * a URL and emails it to a real person over the company's name, which without
 * a pinned destination is a phishing tool with a login screen.
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
  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }

  const link = checkVerificationLink(typeof body.url === "string" ? body.url : "");
  if (!link.ok) {
    return NextResponse.json({ ok: false, error: "bad_link", problem: link.problem }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // Stored before the email goes, because the page the email points at reads
  // the link from the record. Sending first would race a candidate who opens
  // it immediately against a write that has not landed.
  const sentAt = new Date().toISOString();
  const saved = await recordLiveVerificationSent(id, link.url);
  if (!saved) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const token = createLiveVerifyToken({ id, sentAt: saved.liveVerificationSentAt ?? sentAt });
  const invite = {
    fullName: candidate.fullName || "Candidate",
    startUrl: `${baseUrl(req)}/verify/live?t=${encodeURIComponent(token)}`,
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: liveVerificationSubject(),
    html: liveVerificationHtml(invite),
    text: liveVerificationText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[live-verify] not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  // eslint-disable-next-line no-console
  console.log(`[live-verify] sent to ${email} (${saved.liveVerificationCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    liveVerificationUrl: saved.liveVerificationUrl,
    liveVerificationSentAt: saved.liveVerificationSentAt,
    liveVerificationCount: saved.liveVerificationCount,
    liveVerificationOpenedAt: undefined,
    liveVerificationStartedAt: undefined,
  });
}
