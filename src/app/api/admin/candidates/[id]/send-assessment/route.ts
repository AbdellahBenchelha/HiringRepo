import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate } from "@/lib/store";
import { sendAssessmentEmail } from "@/lib/candidateEmails";

/**
 * Send a candidate their assessment link by hand.
 *
 * This is the release valve for an application flagged as a possible
 * duplicate: its email is withheld on submit so a recruiter can compare the
 * two records first, and this endpoint sends it once they decide to proceed.
 * It also covers a candidate who never received the automatic email.
 *
 * The sending itself lives in candidateEmails, shared with the paced batch, so
 * one button and fifty of them cannot drift into sending different things.
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
  const before = await getCandidate(id);
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const result = await sendAssessmentEmail(id, baseUrl(req));
  if (!result.ok) {
    const status = result.reason === "no_email" ? 400 : result.reason === "already_sent" ? 409 : 502;
    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        interviewEmailSentAt: before.interviewEmailSentAt,
      },
      { status },
    );
  }

  const updated = await getCandidate(id);
  return NextResponse.json({ ok: true, interviewEmailSentAt: updated?.interviewEmailSentAt });
}
