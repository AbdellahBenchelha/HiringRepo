import { NextRequest, NextResponse } from "next/server";
import {
  saveApplication,
  claimInterviewEmail,
  releaseInterviewEmail,
  getCandidate,
} from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { sendEmail } from "@/lib/email";
import {
  interviewInviteHtml,
  interviewInviteSubject,
  interviewInviteText,
} from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";

/**
 * Saves the full application for the Admin Panel when a candidate submits the
 * form, then emails them their assessment link.
 *
 * This is separate from — and does not affect — the Telegram notifications,
 * which continue to fire from the client as before.
 */

export const runtime = "nodejs";

/** Each application is written once; the allowance covers retries. */
const MAX_REQUESTS = 30;
const WINDOW_MS = 10 * 60 * 1000;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Public base URL for the assessment link (honours a proxy host). */
function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`applications:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "applications");

  // This body carries the whole application, so it gets the largest cap.
  const parsed = await readJsonBody<{ id?: string; application?: Record<string, unknown> }>(req);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  const id = typeof body.id === "string" ? body.id : "";
  const application = body.application && typeof body.application === "object" ? body.application : {};
  if (!id) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    await saveApplication(id, application);
  } catch {
    return NextResponse.json({ ok: false, error: "storage_error" }, { status: 500 });
  }

  // Email the candidate their assessment link. Best-effort throughout: the
  // application is already saved and the recruiter already has the Telegram
  // notification, so a mail failure must never surface as a failed submit.
  const email = str(application.email);
  const fullName = `${str(application.firstName)} ${str(application.lastName)}`.trim();

  if (!email.includes("@")) {
    // eslint-disable-next-line no-console
    console.warn(`[applications] no usable email on application ${id}; nothing sent`);
  }

  // A flagged application is held back deliberately: its phone matched an
  // earlier candidate, and a recruiter compares the two before the assessment
  // goes out. Released from the Admin Panel with "Send assessment link".
  let flagged = false;
  try {
    flagged = !!(await getCandidate(id))?.duplicateFlag;
  } catch {
    /* storage is best-effort */
  }
  if (flagged) {
    // eslint-disable-next-line no-console
    console.log(`[applications] ${id} flagged as a possible duplicate; assessment email withheld`);
  }

  if (flagged) {
    return NextResponse.json({ ok: true, flagged: true });
  }

  if (email.includes("@")) {
    // Claim first. The flag is written inside the same serialized store write
    // that checks it, so a double submit cannot produce two emails.
    let claimed = false;
    try {
      claimed = await claimInterviewEmail(id);
    } catch {
      /* storage is best-effort */
    }

    if (!claimed) {
      // eslint-disable-next-line no-console
      console.log(`[applications] assessment email already sent for ${id}; not resending`);
    }

    if (claimed) {
      const interviewUrl = `${baseUrl(req)}/interview?c=${id}`;
      const position = str(application.position) || undefined;
      const invite = { fullName: fullName || "Candidate", interviewUrl, position };

      const result = await sendEmail({
        to: email,
        toName: fullName || undefined,
        subject: interviewInviteSubject(position),
        html: interviewInviteHtml(invite),
        text: interviewInviteText(invite),
        replyTo: siteConfig.contact.recruitmentEmail,
      });

      if (result.ok) {
        // Logged on success too: without this, an email that never arrives
        // leaves no trace either way and there is nothing to diagnose from.
        // eslint-disable-next-line no-console
        console.log(`[applications] assessment email accepted by ZeptoMail for ${email}`);
      }

      if (!result.ok) {
        // Give the claim back so a retry — or the recruiter resending from the
        // Admin Panel — is not blocked by a flag set for a mail that never sent.
        try {
          await releaseInterviewEmail(id);
        } catch {
          /* storage is best-effort */
        }
        // eslint-disable-next-line no-console
        console.warn(
          `[applications] assessment email not sent to ${email}:`,
          "skipped" in result ? result.skipped : result.error,
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
