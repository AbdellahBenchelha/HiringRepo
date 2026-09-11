import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { sendVoiceAssessmentEmail } from "@/lib/candidateEmails";

/**
 * Send the post-interview email: congratulations plus the voice-assessment
 * script and instructions, in one message.
 *
 * The work itself lives in candidateEmails so this route and a paced batch run
 * the same code. The record is written first and kept either way — a mail
 * failure must not quietly undo the request — but the recruiter has to be told
 * when nobody was actually emailed, or a candidate waits on a message that
 * never arrives and nobody knows why.
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
  const result = await sendVoiceAssessmentEmail(id, baseUrl(req));
  if (!result.found) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    voiceRequestedAt: result.voiceRequestedAt,
    voiceStatus: result.voiceStatus,
    emailed: result.ok,
    emailError: result.ok ? undefined : result.reason,
  });
}
