/**
 * SERVER-ONLY. One email arriving at @workroute.team, from the Cloudflare
 * Email Worker (see mail-worker/): parse it, keep its attachments, file it in
 * the right inbox, and tell the member.
 */
import PostalMime from "postal-mime";
import { listMembers } from "@/lib/teamStore";
import { putObject, r2Configured } from "@/lib/r2";
import { newId } from "@/lib/id";
import {
  addMail,
  alreadyReceived,
  newMailId,
  snippetOf,
  type MailAddress,
  type MailAttachment,
  type MailMessage,
} from "@/lib/teamMail";
import { cleanInboundHtml } from "@/lib/teamMailHtml";
import { MAX_MAIL_ATTACHMENTS_BYTES } from "@/lib/teamShared";
import { alertMail } from "@/lib/teamNotify";

function addresses(list: { address?: string; name?: string; group?: { address?: string; name?: string }[] }[] | undefined): MailAddress[] {
  const out: MailAddress[] = [];
  for (const a of list ?? []) {
    if (a.group) out.push(...addresses(a.group));
    else if (a.address) out.push({ address: a.address.toLowerCase(), name: a.name || undefined });
  }
  return out;
}

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").trim().slice(0, 100) || "file";
}

export type InboundResult = { ok: true; id: string; memberId: string | null; duplicate?: boolean };

export async function receiveMail(raw: ArrayBuffer, envelopeTo: string): Promise<InboundResult> {
  const email = await PostalMime.parse(raw);
  const to = addresses(email.to as never);
  const cc = addresses(email.cc as never);
  const recipient = (envelopeTo || to[0]?.address || "").toLowerCase();

  const member = (await listMembers()).find((m) => m.workEmail?.toLowerCase() === recipient) ?? null;
  const memberId = member?.id ?? null;
  const messageId = email.messageId || undefined;
  if (await alreadyReceived(memberId, messageId)) return { ok: true, id: "", memberId, duplicate: true };

  const id = newMailId();
  const attachments: MailAttachment[] = [];
  for (const a of email.attachments ?? []) {
    const bytes = Buffer.from(a.content as ArrayBuffer);
    const name = safeName(a.filename || (a.mimeType?.startsWith("image/") ? "image" : "attachment"));
    const att: MailAttachment = {
      id: newId(8),
      name,
      type: a.mimeType || "application/octet-stream",
      size: bytes.length,
      contentId: a.contentId ? a.contentId.replace(/^<|>$/g, "") : undefined,
    };
    if (bytes.length > MAX_MAIL_ATTACHMENTS_BYTES) {
      att.dropped = "larger than 10 MB";
    } else if (!r2Configured()) {
      att.dropped = "file storage is not set up";
    } else {
      const key = `team-mail/${memberId ?? "unknown"}/${id}/${att.id}-${name}`;
      if (await putObject(key, bytes, att.type)) att.key = key;
      else att.dropped = "could not be saved";
    }
    attachments.push(att);
  }

  const text = email.text ?? "";
  const html = email.html ? cleanInboundHtml(email.html) : undefined;
  const from = addresses(email.from ? [email.from as never] : [])[0] ?? { address: "unknown" };
  const message: MailMessage = {
    id,
    memberId,
    folder: "inbox",
    from,
    to,
    cc,
    subject: (email.subject ?? "").slice(0, 300) || "(no subject)",
    at: new Date().toISOString(),
    snippet: snippetOf(text || (html ?? "").replace(/<[^>]+>/g, " ")),
    read: false,
    attachments,
    messageId,
    inReplyTo: email.inReplyTo || undefined,
    references: email.references ? email.references.split(/\s+/).filter(Boolean) : undefined,
    envelopeTo: recipient,
    hasHtml: !!html,
  };
  await addMail(message, { text, html });
  // eslint-disable-next-line no-console
  console.log(`[mail] received for ${memberId ?? `unknown address ${recipient}`}, ${attachments.length} attachment(s)`);
  if (member) await alertMail(member);
  return { ok: true, id, memberId };
}
