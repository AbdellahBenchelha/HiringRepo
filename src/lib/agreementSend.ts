/**
 * SERVER-ONLY. Sending the final agreement, from the View info buttons and
 * from a paced batch on the Accepted tab — see lib/agreement.
 *
 *   sent      draw up the agreement for this candidate, keep the exact PDF,
 *             and email it with the link to send the signed copy back
 *   reminder  the same PDF again, for somebody who has not sent it back
 *   updated   a new version with a changed start date, for somebody who has
 *             not signed yet; it replaces the one before
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
  agreementStart,
  agreementStatus,
  agreementTerms,
  agreementVersions,
  contractorName,
  formatAgreementDate,
  readStartDate,
  type AgreementEvent,
} from "@/lib/agreement";
import { agreementPdf } from "@/lib/agreementPdf";
import { loadSeal } from "@/lib/agreementSeal";
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
  agreementUpdatedHtml,
  agreementUpdatedSubject,
  agreementUpdatedText,
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
  bad_date: 400,
  same_date: 409,
  warmup_limit: 429,
};

export function agreementUrl(base: string, id: string, sentAt: string): string {
  return `${base}/agreement?t=${encodeURIComponent(createAgreementToken({ id, sentAt }))}`;
}

/** Where the exact PDF sent is kept. */
export function agreementKeyFor(id: string, ref: string, at: string): string {
  return `candidates/${id}/agreement-${ref}-${at.slice(11, 19).replace(/:/g, "")}.pdf`;
}

/**
 * The agreement drawn up now for this candidate — for the preview, or to send.
 * `startDate` draws it with a different start date (a new version), without
 * saving anything.
 */
export async function draftAgreement(
  c: Candidate,
  issuedAt: string,
  ref = agreementRef(c.id, issuedAt),
  startDate?: string,
): Promise<{ pdf: Uint8Array; ref: string } | null> {
  const terms = agreementTerms(startDate ? { ...c, agreementStartDate: startDate } : c);
  if (!terms) return null;
  const seal = await loadSeal();
  return { pdf: await agreementPdf({ terms, ref, issuedAt, seal }), ref };
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
  const sent = agreementVersions(c.agreementEvents).at(-1);
  if (!sent) return null;
  return draftAgreement(c, sent.at, sent.ref ?? c.agreementRef);
}

/** One earlier version, for the recruiter: the stored copy, or drawn again. */
export async function agreementVersionPdf(c: Candidate, at: string): Promise<{ pdf: Uint8Array; ref: string } | null> {
  const v = agreementVersions(c.agreementEvents).find((e) => e.at === at);
  if (!v) return null;
  if (v.key) {
    const bytes = await getObjectBytes(v.key, MAX_PDF_BYTES);
    if (bytes) return { pdf: bytes, ref: v.ref ?? "" };
  }
  return draftAgreement(c, v.at, v.ref, v.toDate);
}

/** A new version's reference: the date it was issued, and which version it is. */
function nextRef(c: Candidate, at: string): string {
  return `${agreementRef(c.id, at)}-V${agreementVersions(c.agreementEvents).length + 1}`;
}

export async function sendAgreementEmail(
  id: string,
  base: string,
  opts: {
    kind: AgreementEmailKind;
    by?: string;
    reason?: string;
    override?: boolean;
    /** For "updated": the new start date (yyyy-mm-dd). */
    startDate?: string;
  },
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
  const fromDate = agreementStart(candidate);
  const toDate = opts.kind === "updated" ? readStartDate(opts.startDate) : null;
  if (opts.kind === "updated") {
    // Only while they have not signed: a signed copy is answered with Ask again.
    if (status !== "sent") return { ok: false, reason: "not_waiting" };
    if (!toDate) return { ok: false, reason: "bad_date" };
    if (toDate === fromDate) return { ok: false, reason: "same_date" };
  }
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
  if (opts.kind === "sent" || opts.kind === "updated") {
    doc =
      opts.kind === "updated"
        ? await draftAgreement(candidate, at, nextRef(candidate, at), toDate!)
        : await draftAgreement(candidate, at);
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
    opts.kind === "updated"
      ? (() => {
          const e = {
            ...payload,
            fromDate: fromDate ? formatAgreementDate(fromDate) : "",
            toDate: formatAgreementDate(toDate!),
          };
          return { subject: agreementUpdatedSubject(), html: agreementUpdatedHtml(e), text: agreementUpdatedText(e) };
        })()
      : opts.kind === "reask"
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
    ...(opts.kind === "sent" || opts.kind === "updated" ? { ref: doc.ref, ...(key ? { key } : {}) } : {}),
    ...(opts.kind === "updated" ? { ...(fromDate ? { fromDate } : {}), toDate: toDate! } : {}),
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
