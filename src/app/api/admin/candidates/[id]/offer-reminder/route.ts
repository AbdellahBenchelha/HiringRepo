import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { sendOfferReminderEmail } from "@/lib/candidateEmails";

/**
 * Chase an answer to an offer, with a deadline.
 *
 * An offer nobody has answered is the most expensive silence in the process:
 * the role is held open, nobody else is put forward for it, and the candidate
 * may have taken another job and not thought to say so.
 *
 * The work lives in candidateEmails so this route and a paced batch send the
 * same message under the same guards. Refused for anybody who has already
 * answered — telling somebody who accepted on Tuesday that we are about to
 * delete them is the mistake that guard exists to make impossible.
 *
 * Nothing here deletes anything. The deadline is recorded and the tabs flag it
 * once it passes; erasing a person stays a decision somebody makes in front of
 * the record, with no undo and therefore no automation.
 */

export const runtime = "nodejs";

/** Refusals about the candidate rather than about the mail server. */
const CONFLICT = new Set(["no_offer", "already_answered"]);

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
  const result = await sendOfferReminderEmail(id, baseUrl(req));

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
    offerReminderSentAt: result.offerReminderSentAt,
    offerReminderCount: result.offerReminderCount,
    offerReminders: result.offerReminders,
    offerReplyDeadline: result.offerReplyDeadline,
  });
}
