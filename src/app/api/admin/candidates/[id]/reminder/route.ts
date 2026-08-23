import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordReminder } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { reminderHtml, reminderSubject, reminderText } from "@/lib/emailTemplates";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { siteConfig } from "@/config/site";

/**
 * Chase a candidate who has not finished their assessment.
 *
 * channel "email"    — sends the reminder and logs it.
 * channel "whatsapp" — logs only; the browser opens wa.me itself, because
 *                      WhatsApp has no server-side send without the Business
 *                      API. Logging separately still lets the recruiter see
 *                      which channels a candidate has already been chased on.
 *
 * The link is the candidate's usual /interview?c=<id> — the same one in the
 * original invitation. One permanent link per candidate means a reminder never
 * competes with an earlier message pointing somewhere else.
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

  const parsed = await readJsonBody<{ channel?: string }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const channel = parsed.data.channel === "whatsapp" ? "whatsapp" : "email";

  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // Nothing to chase once they have finished.
  if (candidate.interview) {
    return NextResponse.json({ ok: false, error: "already_completed" }, { status: 409 });
  }

  if (channel === "whatsapp") {
    const updated = await recordReminder(id, "whatsapp");
    return NextResponse.json({
      ok: true,
      reminderWhatsAppSentAt: updated?.reminderWhatsAppSentAt,
      reminderWhatsAppCount: updated?.reminderWhatsAppCount,
    });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
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
    subject: reminderSubject(position),
    html: reminderHtml(invite),
    text: reminderText(invite),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[admin] reminder email not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await recordReminder(id, "email");
  // eslint-disable-next-line no-console
  console.log(`[admin] reminder email sent to ${email} (${updated?.reminderEmailCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    reminderEmailSentAt: updated?.reminderEmailSentAt,
    reminderEmailCount: updated?.reminderEmailCount,
  });
}
