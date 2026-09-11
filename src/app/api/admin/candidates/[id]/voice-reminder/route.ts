import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { sendVoiceReminderEmail } from "@/lib/candidateEmails";

/**
 * Chase a candidate whose voice recording has been asked for and not sent.
 *
 * The work lives in candidateEmails, so this route and a paced batch send the
 * same message under the same guards. Refused when nothing is outstanding: a
 * reminder about a recording we already have is worse than no reminder, since
 * it tells a candidate who did as they were asked that we lost it.
 *
 * Email only. There is no WhatsApp arm here on purpose — sending links from
 * that number to people who have never saved it is what got it banned, and the
 * whole point of moving the assessment here was to stop.
 */

export const runtime = "nodejs";

/** Refusals that are about the candidate, not about the mail server. */
const CONFLICT = new Set(["not_requested", "already_received"]);

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
  const result = await sendVoiceReminderEmail(id, baseUrl(req));

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : CONFLICT.has(result.reason)
          ? 409
          : result.reason === "no_email"
            ? 400
            : 502;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  return NextResponse.json({
    ok: true,
    voiceReminderSentAt: result.voiceReminderSentAt,
    voiceReminderCount: result.voiceReminderCount,
  });
}
