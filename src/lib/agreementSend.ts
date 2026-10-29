/**
 * SERVER-ONLY. Sending the final agreement, from the View info buttons and
 * from a paced batch on the Accepted tab — see lib/agreement.
 *
 *   sent      draw up the agreement for this candidate, keep the exact PDF,
 *             and email it with the link to send the signed copy back
 *   reminder  the same PDF again, for somebody who has not sent it back
 *   reask     the signed copy will not do: says why, with the PDF again
 *
 * Each checks the candidate's state again at the moment of sending, so a
 * batch that waited a minute does not remind somebody who has just uploaded.
 * Nothing is recorded until the email is away.
 */
import { getCandidate, recordAgreementEmail, type Candidate } from "@/lib/store";
import {
  agreementMissing,
  agreementRef,
  agreementStatus,
  agreementTerms,
  contractorName,
  type AgreementEvent,
} from "@/lib/agreement";
import { agreementPdf } from "@/lib/agreementPdf";
import {
  agreementFileName,
  agreementReaskHtml,
  agreementReaskSubject,
  agreementReaskText,
  agreementReceivedHtml,
  agreementReceivedSubject,
  agreementReceivedText,
  agreementReminderHtml,
  agreementReminderSubject,
  agreementReminderText,
  agreementSentHtml,
  agreementSentSubject,
  agreementSentText,
} from "@/lib/agreementEmails";
import { createAgreementToken } from "@/lib/token";
import { sendEmail } from "@/lib/email";
import { getObjectBytes, putObject, r2Configured } from "@/lib/r2";
import { siteConfig } from "@/config/site";

/** Below this, the same email again is refused as a double click. */
const MIN_GAP_MS = 60_000;

/** A stored agreement is a few hundred kilobytes; this only bounds a bad read. */
const MAX_PDF_BYTES = 5 * 1024 * 1024;

export type AgreementEmailKind = AgreementEvent["kind"];

export type AgreementSendOutcome = { ok: true; candidate: Candidate } | { ok: false; reason: string };

export const AGREEMENT_REFUSAL_STATUS: Record<string, number> = {
  not_found: 404,
  no_email: 400,
  no_reason: 400,
  missing: 409,
  already_signed: 409,
  not_waiting: 409,
  no_document: 409,
  not_sent: 409,
  too_soon: 409,
  warmup_limit: 429,
};

export function agreementUrl(base: string, id: string, sentAt: string): string {
  return `${base}/agreement?t=${encodeURIComponent(createAgreementToken({ id, sentAt }))}`;
}

/** Where the exact PDF sent is kept. */
export function agreementKeyFor(id: string, ref: string, at: string): string {
  return `candidates/${id}/agreement-${ref}-${at.slice(11, 19).replace(/:/g, "")}.pdf`;
}

/** The agreement drawn up now for this candidate — for the preview, or to send. */
export async function draftAgreement(
  c: Candidate,
  issuedAt: string,
  ref = agreementRef(c.id, issuedAt),
): Promise<{ pdf: Uint8Array; ref: string } | null> {
  const terms = agreementTerms(c);
  if (!terms) return null;
  return { pdf: await agreementPdf({ terms, ref, issuedAt }), ref };
}

/**
 * The PDF that was sent: read back from storage, or — if storage is not set
 * up or the copy cannot be read — drawn again with the same reference and
 * date, which gives the same document from the same details.
 */
export async function sentAgreementPdf(c: Candidate): Promise<{ pdf: Uint8Array; ref: string } | null> {
  if (c.agreementKey) {
    const bytes = await getObjectBytes(c.agreementKey, MAX_PDF_BYTES);
    if (bytes && c.agreementRef) return { pdf: bytes, ref: c.agreementRef };
  }
  const sent = [...(c.agreementEvents ?? [])].reverse().find((e) => e.kind === "sent");
  if (!sent) return null;
  return draftAgreement(c, sent.at, sent.ref ?? c.agreementRef);
}

export async function sendAgreementEmail(
  id: string,
  base: string,
  opts: { kind: AgreementEmailKind; by?: string; reason?: string; override?: boolean },
): Promise<AgreementSendOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };
  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return { ok: false, reason: "no_email" };

  const status = agreementStatus(candidate);
  if (opts.kind === "sent") {
    if (agreementMissing(candidate).length) return { ok: false, reason: "missing" };
    if (status === "signed" || status === "approved") return { ok: false, reason: "already_signed" };
  }
  if (opts.kind === "reminder" && status !== "sent") return { ok: false, reason: "not_waiting" };
  if (opts.kind === "reask") {
    if (status !== "signed" && status !== "approved") return { ok: false, reason: "no_document" };
    if (!opts.reason) return { ok: false, reason: "no_reason" };
  }

  const last = candidate.agreementEvents?.at(-1);
  if (last && last.kind === opts.kind && Date.now() - Date.parse(last.at) < MIN_GAP_MS) {
    return { ok: false, reason: "too_soon" };
  }

  const at = new Date().toISOString();
  let doc: { pdf: Uint8Array; ref: string } | null;
  let key: string | undefined;
  if (opts.kind === "sent") {
    doc = await draftAgreement(candidate, at);
    if (!doc) return { ok: false, reason: "missing" };
    if (r2Configured()) {
      const k = agreementKeyFor(id, doc.ref, at);
      if (await putObject(k, Buffer.from(doc.pdf), "application/pdf")) key = k;
    }
  } else {
    doc = await sentAgreementPdf(candidate);
    if (!doc) return { ok: false, reason: "not_sent" };
  }

  const name = contractorName(candidate) || candidate.fullName || "";
  const url = agreementUrl(base, id, at);
  const payload = { fullName: name, url, ref: doc.ref };
  const message =
    opts.kind === "reask"
      ? {
          subject: agreementReaskSubject(),
          html: agreementReaskHtml({ ...payload, reason: opts.reason ?? "" }),
          text: agreementReaskText({ ...payload, reason: opts.reason ?? "" }),
        }
      : opts.kind === "reminder"
        ? { subject: agreementReminderSubject(), html: agreementReminderHtml(payload), text: agreementReminderText(payload) }
        : { subject: agreementSentSubject(), html: agreementSentHtml(payload), text: agreementSentText(payload) };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    ...message,
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
    override: opts.override,
    attachments: [{ name: agreementFileName(name), mimeType: "application/pdf", content: doc.pdf }],
  });
  if (!result.ok) {
    const why = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[agreement] ${opts.kind} for ${id} not sent: ${why}`);
    return { ok: false, reason: why };
  }

  const updated = await recordAgreementEmail(id, {
    at,
    by: opts.by,
    kind: opts.kind,
    ...(opts.kind === "sent" ? { ref: doc.ref, ...(key ? { key } : {}) } : {}),
    ...(opts.kind === "reask" ? { reason: opts.reason } : {}),
  });
  if (!updated) return { ok: false, reason: "not_found" };
  // eslint-disable-next-line no-console
  console.log(`[agreement] ${opts.kind} sent to ${id}${opts.by ? ` by ${opts.by}` : ""} (${doc.ref})`);
  return { ok: true, candidate: updated };
}

/** "We have your signed agreement" — answers their upload, so never held back. */
export async function sendAgreementReceived(c: Candidate): Promise<void> {
  const email = (c.email || "").trim();
  if (!email.includes("@")) return;
  const e = { fullName: contractorName(c) || c.fullName || "", ref: c.agreementRef ?? "" };
  const r = await sendEmail({
    to: email,
    toName: c.fullName || undefined,
    subject: agreementReceivedSubject(),
    html: agreementReceivedHtml(e),
    text: agreementReceivedText(e),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "reactive",
  });
  if (!r.ok) {
    // eslint-disable-next-line no-console
    console.warn(`[agreement] "received" email to ${c.id} not sent: ${"skipped" in r ? r.skipped : r.error}`);
  }
}
