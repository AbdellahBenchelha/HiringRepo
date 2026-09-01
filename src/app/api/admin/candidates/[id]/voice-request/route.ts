import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { recordVoiceRequest } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { voiceAssessmentHtml, voiceAssessmentSubject, voiceAssessmentText } from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";

/**
 * Send the post-interview email: congratulations plus the voice-assessment
 * script and instructions, in one message.
 *
 * The record is written first and kept either way — a mail failure must not
 * quietly undo the request — but the recruiter has to be told when nobody was
 * actually emailed, or a candidate waits on a message that never arrives and
 * nobody knows why. Same pattern as the identity-verification email request.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const updated = await recordVoiceRequest(id);
  if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const email = (updated.email || "").trim();
  let emailed = false;
  let emailError: string | undefined;

  if (email.includes("@")) {
    const invite = {
      fullName: updated.fullName || "Candidate",
      email,
      position: updated.position || undefined,
    };
    const result = await sendEmail({
      to: email,
      toName: updated.fullName || undefined,
      subject: voiceAssessmentSubject(),
      html: voiceAssessmentHtml(invite),
      text: voiceAssessmentText(invite),
      replyTo: siteConfig.contact.recruitmentEmail,
    });
    emailed = result.ok;
    if (!result.ok) {
      emailError = "skipped" in result ? result.skipped : result.error;
      // eslint-disable-next-line no-console
      console.warn(`[voice-assessment] ${id} requested but email not sent: ${emailError}`);
    }
  } else {
    emailError = "no_email";
  }

  return NextResponse.json({
    ok: true,
    voiceRequestedAt: updated.voiceRequestedAt,
    voiceStatus: updated.voiceStatus,
    emailed,
    emailError,
  });
}
