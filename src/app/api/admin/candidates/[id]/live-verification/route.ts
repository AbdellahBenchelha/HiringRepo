import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import {
  getCandidate,
  recordLiveVerificationSent,
  replaceLiveVerificationLink,
  setLiveVerificationHold,
} from "@/lib/store";
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
 * that person with whichever verification provider they use. Nothing here runs
 * on a schedule and nothing sends itself: the decision that photographs were
 * not enough is a human one.
 *
 * Which provider is the recruiter's business, so the destination is not
 * restricted. The scheme is: this link asks somebody to photograph their
 * passport and carries a session identifier, and over plain http both are
 * readable by anyone in between. The provider host is logged with every send,
 * so where the links went is answerable afterwards.
 *
 * Three actions, and the difference is whether anything lands in an inbox.
 * "send" emails a link. "replace" swaps the provider session behind a link
 * they already hold and emails nothing — a provider session expires long
 * before a candidate gets round to it, and writing to somebody every time one
 * does is our filing problem arriving in their inbox. "hold" marks the session
 * dead, so anybody opening their link waits on our page instead of arriving at
 * a session the provider has closed.
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
  let body: { url?: unknown; action?: unknown };
  try {
    body = (await req.json()) as { url?: unknown; action?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }

  // Holding somebody needs no link — the whole point is that there is not a
  // working one yet. Everything else is about a URL, so that is checked first.
  if (body.action === "hold") {
    const held = await setLiveVerificationHold(id, true);
    if (!held) {
      const exists = await getCandidate(id);
      return exists
        ? NextResponse.json({ ok: false, error: "never_sent" }, { status: 409 })
        : NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    // eslint-disable-next-line no-console
    console.log(`[live-verify] ${id} held on the waiting page, no email sent`);
    return NextResponse.json({
      ok: true,
      held: true,
      liveVerificationUrl: held.liveVerificationUrl,
      liveVerificationSentAt: held.liveVerificationSentAt,
      liveVerificationCount: held.liveVerificationCount,
      liveVerificationOpenedAt: held.liveVerificationOpenedAt,
      liveVerificationStartedAt: held.liveVerificationStartedAt,
      liveVerificationLinkChangedAt: held.liveVerificationLinkChangedAt,
      liveVerificationLinkChangeCount: held.liveVerificationLinkChangeCount,
      liveVerificationHeldAt: held.liveVerificationHeldAt,
    });
  }

  const link = checkVerificationLink(typeof body.url === "string" ? body.url : "");
  if (!link.ok) {
    return NextResponse.json({ ok: false, error: "bad_link", problem: link.problem }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Swap the destination behind a link already in their inbox. No email, so no
  // address is needed and the send count does not move.
  if (body.action === "replace") {
    if (!candidate.liveVerificationSentAt) {
      return NextResponse.json({ ok: false, error: "never_sent" }, { status: 409 });
    }
    const saved = await replaceLiveVerificationLink(id, link.url);
    if (!saved) return NextResponse.json({ ok: false, error: "never_sent" }, { status: 409 });
    // eslint-disable-next-line no-console
    console.log(
      `[live-verify] link replaced for ${id} → ${link.provider ?? new URL(link.url).hostname}` +
        ` (${saved.liveVerificationLinkChangeCount ?? 1}), no email sent`,
    );
    return NextResponse.json({
      ok: true,
      replaced: true,
      liveVerificationUrl: saved.liveVerificationUrl,
      liveVerificationSentAt: saved.liveVerificationSentAt,
      liveVerificationCount: saved.liveVerificationCount,
      liveVerificationOpenedAt: saved.liveVerificationOpenedAt,
      liveVerificationStartedAt: saved.liveVerificationStartedAt,
      liveVerificationLinkChangedAt: saved.liveVerificationLinkChangedAt,
      liveVerificationLinkChangeCount: saved.liveVerificationLinkChangeCount,
      liveVerificationHeldAt: saved.liveVerificationHeldAt,
    });
  }

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
    kind: "campaign",
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[live-verify] not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  // eslint-disable-next-line no-console
  console.log(
    `[live-verify] sent to ${email} via ${link.provider ?? new URL(link.url).hostname}` +
      ` (${saved.liveVerificationCount ?? 1})`,
  );
  return NextResponse.json({
    ok: true,
    liveVerificationUrl: saved.liveVerificationUrl,
    liveVerificationSentAt: saved.liveVerificationSentAt,
    liveVerificationCount: saved.liveVerificationCount,
    liveVerificationOpenedAt: undefined,
    liveVerificationStartedAt: undefined,
  });
}
