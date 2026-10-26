import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, verifyAdminRequest } from "@/lib/adminAuth";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { isValidEmail } from "@/lib/validation";
import { applicantEmailProblem } from "@/lib/emailMx";
import { EMAIL_PROBLEM_MESSAGE } from "@/lib/emailCheck";
import { cleanEmailHtml, emailHtmlToText, isEmptyEmail } from "@/lib/composeEmail";
import { MAX_BODY_HTML, MAX_SUBJECT, type ComposeDesign } from "@/lib/composeOptions";
import { composedEmailHtml } from "@/lib/emailTemplates";
import { sendEmail } from "@/lib/email";
import { addSentEmail, getSentEmail, lastSentTo, listSentEmails } from "@/lib/sentEmailStore";
import { currentAllowance } from "@/lib/warmupStore";
import { getCandidate } from "@/lib/store";
import { siteConfig } from "@/config/site";

/**
 * The Send email tab: one hand-written email to one address.
 *
 *   POST { action: "preview", subject, html, design }   the email exactly as it will be sent
 *   POST { action: "send", to, toName?, candidateId?, subject, html, design, override? }
 *   GET  ?id=<id>                                         one sent email, as it looked
 *   GET  ?offset=<n>                                      the history, 50 at a time
 *
 * The editor's HTML is cleaned here (lib/composeEmail) — never trusted as it
 * arrives — and the cleaned copy is what is sent, previewed and kept.
 */

export const runtime = "nodejs";

/** The same address and subject again inside this is a double click. */
const MIN_GAP_MS = 60_000;

function readDesign(v: unknown): ComposeDesign {
  return v === "plain" ? "plain" : "workroute";
}

function build(subject: string, rawHtml: string, design: ComposeDesign) {
  const bodyHtml = cleanEmailHtml(rawHtml);
  return {
    bodyHtml,
    html: composedEmailHtml({ subject, bodyHtml, design }),
    text: emailHtmlToText(bodyHtml),
    empty: isEmptyEmail(bodyHtml),
  };
}

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const entry = await getSentEmail(id);
    if (!entry) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      entry: { ...entry, bodyHtml: undefined },
      html: composedEmailHtml({ subject: entry.subject, bodyHtml: entry.bodyHtml, design: entry.design }),
    });
  }
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset")) || 0);
  const page = await listSentEmails(50, offset);
  return NextResponse.json({ ok: true, ...page });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";

  const parsed = await readJsonBody<{
    action?: string;
    to?: unknown;
    toName?: unknown;
    candidateId?: unknown;
    subject?: unknown;
    html?: unknown;
    design?: unknown;
    override?: unknown;
  }>(req, MAX_BODY_HTML + 8 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  const subject = typeof body.subject === "string" ? body.subject.replace(/\s+/g, " ").trim() : "";
  const rawHtml = typeof body.html === "string" ? body.html : "";
  const design = readDesign(body.design);
  if (rawHtml.length > MAX_BODY_HTML) {
    return NextResponse.json({ ok: false, error: "too_long", problems: ["The email is too long."] }, { status: 400 });
  }

  if (body.action === "preview") {
    const built = build(subject || "(no subject)", rawHtml, design);
    return NextResponse.json({ ok: true, html: built.html, text: built.text, empty: built.empty });
  }

  if (body.action !== "send") return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });

  // ----- checks, all reported together --------------------------------------
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const problems: string[] = [];
  if (!to) problems.push("Enter the address to send to.");
  else if (!isValidEmail(to)) problems.push("The To address does not look like an email address.");
  else {
    const problem = await applicantEmailProblem(to);
    if (problem) problems.push(`The To address cannot receive email: ${EMAIL_PROBLEM_MESSAGE[problem]}`);
  }
  if (!subject) problems.push("Write a subject.");
  else if (subject.length > MAX_SUBJECT) problems.push(`The subject is longer than ${MAX_SUBJECT} characters.`);
  const built = build(subject, rawHtml, design);
  if (built.empty) problems.push("Write the email content.");
  if (problems.length) return NextResponse.json({ ok: false, error: "invalid", problems }, { status: 400 });

  const last = await lastSentTo(to, subject);
  if (last && Date.now() - Date.parse(last.at) < MIN_GAP_MS) {
    return NextResponse.json({ ok: false, error: "too_soon" }, { status: 409 });
  }

  // A candidate link is kept only when it really is that candidate's address.
  let candidateId: string | undefined;
  let toName = typeof body.toName === "string" ? body.toName.trim().slice(0, 120) : "";
  if (typeof body.candidateId === "string" && body.candidateId) {
    const c = await getCandidate(body.candidateId);
    if (c && c.email.trim().toLowerCase() === to.toLowerCase()) {
      candidateId = c.id;
      toName = toName || c.fullName;
    }
  }

  const result = await sendEmail({
    to,
    toName: toName || undefined,
    subject,
    html: built.html,
    text: built.text,
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
    override: body.override === true,
  });

  if (!result.ok) {
    const error = "skipped" in result ? result.skipped : result.error;
    // The daily limit is a question for the sender, not a failure to record.
    if (error === "warmup_limit") {
      return NextResponse.json({ ok: false, error, allowance: await currentAllowance() }, { status: 429 });
    }
    const entry = await addSentEmail({
      by, to, toName: toName || undefined, candidateId, subject, bodyHtml: built.bodyHtml, design, status: "failed", error,
    });
    // eslint-disable-next-line no-console
    console.warn(`[send-email] to ${to} by ${by} failed: ${error}`);
    return NextResponse.json({ ok: false, error, entry: { ...entry, bodyHtml: undefined } }, { status: 502 });
  }

  const entry = await addSentEmail({
    by, to, toName: toName || undefined, candidateId, subject, bodyHtml: built.bodyHtml, design, status: "sent",
  });
  // eslint-disable-next-line no-console
  console.log(`[send-email] sent to ${to} by ${by}${body.override === true ? " (past the daily limit)" : ""}`);
  return NextResponse.json({ ok: true, entry: { ...entry, bodyHtml: undefined } });
}
