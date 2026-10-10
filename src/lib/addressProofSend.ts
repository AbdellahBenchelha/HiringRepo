/**
 * SERVER-ONLY. The three proof-of-address emails, sent the same way from the
 * View info buttons and from a paced batch on the Accepted tab.
 *
 *   request   the first ask ("Your agreement is ready — please confirm your
 *             address"), or the same again for somebody who has not answered
 *   reminder  a nudge for somebody asked who has not uploaded
 *   reask     the document they sent will not do: says why, and opens their
 *             page again for a new one
 *
 * Each checks the candidate's state again at the moment of sending, so a batch
 * that waited a minute does not ask somebody who has just uploaded.
 *
 * The link never expires and a newer one does not retire an older one — the
 * page reads the candidate's current state — so nothing is recorded until the
 * email is away, and nothing has to be undone when it is not.
 */
import { getCandidate, recordAddressProofEmail, type Candidate } from "@/lib/store";
import { addressProofStatus, type AddressProofEvent } from "@/lib/addressProof";
import { createAddressProofToken } from "@/lib/token";
import { sendEmail } from "@/lib/email";
import {
  addressProofReaskHtml,
  addressProofReaskSubject,
  addressProofReaskText,
  addressProofReminderHtml,
  addressProofReminderSubject,
  addressProofReminderText,
  addressProofRequestHtml,
  addressProofRequestSubject,
  addressProofRequestText,
} from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";

/** Below this, a second email is refused as a double click. */
const MIN_GAP_MS = 60_000;

export type AddressEmailKind = AddressProofEvent["kind"];

export type AddressSendOutcome = { ok: true; candidate: Candidate } | { ok: false; reason: string };

export const ADDRESS_REFUSAL_STATUS: Record<string, number> = {
  not_found: 404,
  no_email: 400,
  no_reason: 400,
  not_accepted: 409,
  already_received: 409,
  not_waiting: 409,
  no_document: 409,
  too_soon: 409,
  warmup_limit: 429,
};

export function addressProofUrl(base: string, id: string, sentAt: string): string {
  return `${base}/address?t=${encodeURIComponent(createAddressProofToken({ id, sentAt }))}`;
}

export async function sendAddressProofEmail(
  id: string,
  base: string,
  opts: { kind: AddressEmailKind; by?: string; reason?: string; override?: boolean },
): Promise<AddressSendOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };
  // The email says the agreement is ready, which is only true once they accepted.
  if (!candidate.offerAcceptedAt) return { ok: false, reason: "not_accepted" };

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) return { ok: false, reason: "no_email" };

  const status = addressProofStatus(candidate);
  if (opts.kind === "request" && (status === "received" || status === "approved")) {
    return { ok: false, reason: "already_received" };
  }
  if (opts.kind === "reminder" && status !== "asked") return { ok: false, reason: "not_waiting" };
  if (opts.kind === "reask") {
    if (status !== "received" && status !== "approved") return { ok: false, reason: "no_document" };
    if (!opts.reason) return { ok: false, reason: "no_reason" };
  }

  // The same email twice within a minute is a double click (or a batch
  // overlapping a button press). A different one — a new-document request
  // right after a request — is a decision, and goes.
  const last = candidate.addressProofEvents?.at(-1);
  if (last && last.kind === opts.kind && Date.now() - Date.parse(last.at) < MIN_GAP_MS) {
    return { ok: false, reason: "too_soon" };
  }

  const at = new Date().toISOString();
  const url = addressProofUrl(base, id, at);
  const fullName = candidate.confirmedDetails
    ? `${candidate.confirmedDetails.firstName} ${candidate.confirmedDetails.lastName}`.trim()
    : candidate.fullName || "";
  const payload = { fullName: fullName || candidate.fullName || "", url };

  const message =
    opts.kind === "reask"
      ? {
          subject: addressProofReaskSubject(),
          html: addressProofReaskHtml({ ...payload, reason: opts.reason ?? "" }),
          text: addressProofReaskText({ ...payload, reason: opts.reason ?? "" }),
        }
      : opts.kind === "reminder"
        ? {
            subject: addressProofReminderSubject(),
            html: addressProofReminderHtml(payload),
            text: addressProofReminderText(payload),
          }
        : {
            subject: addressProofRequestSubject(),
            html: addressProofRequestHtml(payload),
            text: addressProofRequestText(payload),
          };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    ...message,
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
    override: opts.override,
  });
  if (!result.ok) {
    const why = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[address] ${opts.kind} for ${id} not sent: ${why}`);
    return { ok: false, reason: why };
  }

  const updated = await recordAddressProofEmail(id, {
    at,
    by: opts.by,
    kind: opts.kind,
    ...(opts.kind === "reask" ? { reason: opts.reason } : {}),
  });
  if (!updated) return { ok: false, reason: "not_found" };
  // eslint-disable-next-line no-console
  console.log(`[address] ${opts.kind} sent to ${id}${opts.by ? ` by ${opts.by}` : ""}`);
  return { ok: true, candidate: updated };
}
