/**
 * SERVER-ONLY. The response that shows one email — for the member, and
 * read-only for a recruiter. See lib/teamMailHtml for why it is its own,
 * sandboxed page.
 */
import { NextResponse } from "next/server";
import { getObjectBytes, presignDownload } from "@/lib/r2";
import { getMailBody, type MailMessage } from "@/lib/teamMail";
import { mailViewDocument } from "@/lib/teamMailHtml";

/** Pictures sent inside the email are inlined, up to this much in total. */
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

export async function mailViewResponse(message: MailMessage, showImages: boolean): Promise<Response> {
  const body = await getMailBody(message.id);
  const inline = new Map<string, string>();
  let total = 0;
  for (const a of message.attachments) {
    if (!a.contentId || !a.key || !a.type.startsWith("image/")) continue;
    if (total + a.size > MAX_INLINE_BYTES) break;
    const bytes = await getObjectBytes(a.key, a.size + 1);
    if (!bytes) continue;
    total += a.size;
    inline.set(a.contentId, `data:${a.type};base64,${Buffer.from(bytes).toString("base64")}`);
  }
  const { html, csp } = mailViewDocument(body, inline, showImages);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": csp,
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}

/** Download one attachment: a short-lived link straight to storage. */
export async function mailAttachmentResponse(message: MailMessage, attachmentId: string): Promise<Response> {
  const a = message.attachments.find((x) => x.id === attachmentId);
  if (!a?.key) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const url = await presignDownload(a.key, a.name.replace(/"/g, ""));
  if (!url) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  return NextResponse.redirect(url, 302);
}
