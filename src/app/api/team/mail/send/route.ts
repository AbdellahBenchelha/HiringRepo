import { NextRequest, NextResponse } from "next/server";
import { verifyMemberRequest } from "@/lib/teamAuth";
import { isValidEmail } from "@/lib/validation";
import { getObjectBytes, putObject, r2Configured } from "@/lib/r2";
import { newId } from "@/lib/id";
import {
  addMail,
  formatAddress,
  getMail,
  getMailBody,
  newMailId,
  sentToday,
  snippetOf,
  type MailAttachment,
  type MailMessage,
} from "@/lib/teamMail";
import { mailSendingReady, sendTeamMail } from "@/lib/teamMailSend";
import {
  MAIL_DAILY_LIMIT,
  MAX_MAIL_ATTACHMENTS_BYTES,
  MAX_MAIL_BODY,
  MAX_MAIL_RECIPIENTS,
  formatDateTime,
} from "@/lib/teamShared";

/**
 * A member sends an email from their @workroute.team address: a new one, a
 * reply (the original quoted, threaded with In-Reply-To) or a forward (its
 * attachments included if asked).
 *
 *   form { to, cc, subject, body, replyTo?, forwardOf?, includeAttachments?, files* }
 */

export const runtime = "nodejs";

const BLOCKED = /\.(exe|bat|cmd|com|scr|msi|js|jse|vbs|vbe|ps1|jar|wsf|hta|cpl|reg|lnk)$/i;

const bad = (problem: string, status = 400) => NextResponse.json({ ok: false, problems: [problem] }, { status });

function recipients(v: FormDataEntryValue | null): string[] {
  return typeof v === "string" ? v.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean) : [];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return esc(text).replace(/\r?\n/g, "<br>");
}

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").trim().slice(0, 100) || "file";
}

export async function POST(req: NextRequest) {
  const member = await verifyMemberRequest(req.headers.get("x-csrf-token"));
  if (!member) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!member.workEmail) return bad("You do not have a work email address yet.", 409);
  if (!mailSendingReady()) return bad("Sending email is not set up yet. Please try again later.", 503);
  if ((await sentToday(member.id)) >= MAIL_DAILY_LIMIT) {
    return bad(`You have reached today's limit of ${MAIL_DAILY_LIMIT} emails. Please try again tomorrow.`, 429);
  }

  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_MAIL_ATTACHMENTS_BYTES + 256 * 1024) {
    return bad("The attachments are larger than 10 MB in total.", 413);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("The email could not be read. Please try again.");
  }

  const to = recipients(form.get("to"));
  const cc = recipients(form.get("cc"));
  const subject = (typeof form.get("subject") === "string" ? String(form.get("subject")) : "").replace(/\s+/g, " ").trim().slice(0, 200);
  const body = (typeof form.get("body") === "string" ? String(form.get("body")) : "").replace(/\r\n/g, "\n").slice(0, MAX_MAIL_BODY);

  const problems: string[] = [];
  if (!to.length) problems.push("Add at least one address in To.");
  const wrong = [...to, ...cc].filter((a) => !isValidEmail(a));
  if (wrong.length) problems.push(`These addresses do not look right: ${wrong.join(", ")}`);
  if (to.length + cc.length > MAX_MAIL_RECIPIENTS) problems.push(`Send to at most ${MAX_MAIL_RECIPIENTS} addresses at once.`);
  if (!subject) problems.push("Write a subject.");
  if (problems.length) return NextResponse.json({ ok: false, problems }, { status: 400 });

  // The email being answered or forwarded, if any — only one of their own.
  const refId = String(form.get("replyTo") || form.get("forwardOf") || "");
  const mode: "new" | "reply" | "forward" = form.get("replyTo") ? "reply" : form.get("forwardOf") ? "forward" : "new";
  const original = refId ? await getMail(refId) : null;
  if (refId && (!original || original.memberId !== member.id)) return bad("The original email could not be found.", 404);
  const originalBody = original ? await getMailBody(original.id) : null;

  // Attachments: what they added, and (forwarding) the original's.
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const outgoing: { filename: string; content: Buffer; type: string }[] = [];
  let total = 0;
  for (const f of files) {
    if (BLOCKED.test(f.name)) return bad(`${f.name}: this kind of file cannot be sent.`);
    total += f.size;
    if (total > MAX_MAIL_ATTACHMENTS_BYTES) return bad("The attachments are larger than 10 MB in total.");
    outgoing.push({ filename: safeName(f.name), content: Buffer.from(await f.arrayBuffer()), type: f.type || "application/octet-stream" });
  }
  if (mode === "forward" && original && form.get("includeAttachments") === "1") {
    for (const a of original.attachments) {
      if (!a.key || a.contentId) continue;
      total += a.size;
      if (total > MAX_MAIL_ATTACHMENTS_BYTES) return bad("With the original attachments, this email would be larger than 10 MB.");
      const bytes = await getObjectBytes(a.key, a.size + 1);
      if (bytes) outgoing.push({ filename: a.name, content: Buffer.from(bytes), type: a.type });
    }
  }

  // The text, with the original underneath.
  let text = body;
  let html = `<div>${paragraphs(body)}</div>`;
  let inReplyTo: string | undefined;
  let references: string[] | undefined;
  if (original && originalBody) {
    const when = formatDateTime(original.at);
    const origText = originalBody.text || "";
    if (mode === "reply") {
      const quoted = origText.split("\n").map((l) => `> ${l}`).join("\n");
      text = `${body}\n\nOn ${when}, ${formatAddress(original.from)} wrote:\n${quoted}`;
      html += `<br><div>On ${esc(when)}, ${esc(formatAddress(original.from))} wrote:</div><blockquote style="margin:0 0 0 8px;padding-left:12px;border-left:3px solid #ccc">${originalBody.html ?? paragraphs(origText)}</blockquote>`;
      inReplyTo = original.messageId;
      references = [...(original.references ?? []), ...(original.messageId ? [original.messageId] : [])];
    } else {
      const header = [
        "---------- Forwarded message ----------",
        `From: ${formatAddress(original.from)}`,
        `Date: ${when}`,
        `Subject: ${original.subject}`,
        `To: ${original.to.map(formatAddress).join(", ")}`,
      ];
      text = `${body}\n\n${header.join("\n")}\n\n${origText}`;
      html += `<br><div>${header.map(esc).join("<br>")}</div><br>${originalBody.html ?? paragraphs(origText)}`;
    }
  }

  const result = await sendTeamMail({
    from: { address: member.workEmail, name: member.fullName },
    to,
    cc,
    subject,
    text,
    html,
    inReplyTo,
    references,
    attachments: outgoing.map(({ filename, content }) => ({ filename, content })),
  });

  // Keep a copy in Sent, with its attachments, whether or not it left.
  const id = newMailId();
  const attachments: MailAttachment[] = [];
  for (const o of outgoing) {
    const att: MailAttachment = { id: newId(8), name: o.filename, type: o.type, size: o.content.length };
    if (r2Configured()) {
      const key = `team-mail/${member.id}/${id}/${att.id}-${o.filename}`;
      if (await putObject(key, o.content, o.type)) att.key = key;
    }
    attachments.push(att);
  }
  const sent: MailMessage = {
    id,
    memberId: member.id,
    folder: "sent",
    from: { address: member.workEmail, name: member.fullName },
    to: to.map((address) => ({ address })),
    cc: cc.map((address) => ({ address })),
    subject,
    at: new Date().toISOString(),
    snippet: snippetOf(body),
    read: true,
    attachments,
    inReplyTo,
    references,
    hasHtml: true,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? undefined : result.error,
  };
  await addMail(sent, { text, html });

  if (!result.ok) {
    return bad("The email could not be sent. It is saved in Sent — please try again in a moment.", 502);
  }
  // eslint-disable-next-line no-console
  console.log(`[mail] ${member.id} sent an email (${mode}) to ${to.length + cc.length} address(es)`);
  return NextResponse.json({ ok: true, id });
}
