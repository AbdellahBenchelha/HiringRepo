/**
 * SERVER-ONLY. Reading a ticket form — text plus up to three screenshots —
 * the same way for members and recruiters.
 */
import { storeTeamFile } from "@/lib/teamFiles";
import type { Attachment } from "@/lib/teamStore";
import { MAX_ATTACHMENT_BYTES, MAX_TICKET_BODY } from "@/lib/teamShared";

export const MAX_ATTACHMENTS = 3;
/** The largest whole request a ticket form may be. */
export const MAX_TICKET_FORM_BYTES = MAX_ATTACHMENTS * MAX_ATTACHMENT_BYTES + 64 * 1024;

export async function readForm(req: Request): Promise<FormData | null> {
  const declared = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_TICKET_FORM_BYTES) return null;
  try {
    return await req.formData();
  } catch {
    return null;
  }
}

export function field(form: FormData, name: string, max: number): string {
  const v = form.get(name);
  return typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}

export function ticketBody(form: FormData): string {
  return field(form, "body", MAX_TICKET_BODY);
}

/** Store the screenshots on a form, or say why one could not be. */
export async function readAttachments(
  form: FormData,
  memberId: string,
): Promise<{ ok: true; attachments: Attachment[] } | { ok: false; problem: string }> {
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > MAX_ATTACHMENTS) return { ok: false, problem: `Attach at most ${MAX_ATTACHMENTS} images.` };
  const attachments: Attachment[] = [];
  for (const f of files) {
    const stored = await storeTeamFile(memberId, f, "image");
    if (!stored.ok) return { ok: false, problem: `${f.name}: ${stored.problem}` };
    attachments.push({ key: stored.key, name: stored.name, type: stored.type, size: stored.size });
  }
  return { ok: true, attachments };
}
