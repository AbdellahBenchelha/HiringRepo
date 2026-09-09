import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordReminder } from "@/lib/store";
import { sendReminderEmail } from "@/lib/candidateEmails";
import { readJsonBody, badBodyResponse } from "@/lib/http";

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

  const result = await sendReminderEmail(id, baseUrl(req));
  if (!result.ok) {
    const status = result.reason === "no_email" ? 400 : 502;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  const updated = await getCandidate(id);
  return NextResponse.json({
    ok: true,
    reminderEmailSentAt: updated?.reminderEmailSentAt,
    reminderEmailCount: updated?.reminderEmailCount,
  });
}
