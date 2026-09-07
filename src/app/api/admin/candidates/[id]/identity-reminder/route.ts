import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordIdentityReminder } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  identityReminderHtml,
  identityReminderSubject,
  identityReminderText,
} from "@/lib/emailTemplates";
import { identityStillNeeded } from "@/lib/verification";
import { createOfferToken } from "@/lib/token";
import { siteConfig } from "@/config/site";

/**
 * Chase identity documents from a candidate who has accepted an offer.
 *
 * They are the group that stalls silently. Accepting is the moment they feel
 * finished, and the identity step comes after it — so someone who closed the
 * tab, or whose phone rang, has no reason to come back and nothing in their
 * inbox saying anything is outstanding. Meanwhile no agreement can be issued,
 * and from their side it looks as though we have gone quiet on them.
 *
 * Refused unless both halves are true: they have accepted, and they still owe
 * documents. Chasing someone who has not accepted points at a page that will
 * not ask them for anything; chasing someone who has already sent them tells a
 * person who did as they were asked that we lost their passport photograph.
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

  if (!candidate.offerAcceptedAt || !candidate.offerSentAt || !candidate.offer) {
    return NextResponse.json({ ok: false, error: "not_accepted" }, { status: 409 });
  }
  if (!identityStillNeeded(candidate)) {
    return NextResponse.json({ ok: false, error: "already_provided" }, { status: 409 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // Their offer link, not a new address. It already resumes the identity step
  // for anyone who still owes documents, and it is a link they have seen
  // before — which matters for a message asking to photograph a passport.
  const token = createOfferToken({ id, offerSentAt: candidate.offerSentAt });
  const invite = {
    fullName: candidate.fullName || "Candidate",
    uploadUrl: `${baseUrl(req)}/offer?t=${encodeURIComponent(token)}`,
    position: candidate.offer.position || candidate.position || undefined,
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: identityReminderSubject(),
    html: identityReminderHtml(invite),
    text: identityReminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[identity] reminder not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await recordIdentityReminder(id);
  // eslint-disable-next-line no-console
  console.log(`[identity] reminder sent to ${email} (${updated?.identityReminderCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    identityReminderSentAt: updated?.identityReminderSentAt,
    identityReminderCount: updated?.identityReminderCount,
  });
}
