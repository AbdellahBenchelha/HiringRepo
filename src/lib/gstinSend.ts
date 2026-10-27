/**
 * SERVER-ONLY. The two GSTIN emails, sent the same way from the View info
 * buttons and from a paced batch on the Accepted tab:
 *
 *   sendGstinRequestEmail   "Action Required: GSTIN Needed to Finalize Your Agreement"
 *   sendGstinWaitingEmail   "Your place is waiting for you — send us your GSTIN when ready"
 *
 * Both go only to somebody in India who accepted and has no GSTIN (lib/pan
 * gstinWaitingRefusal), checked again at the moment of sending, so a batch
 * that waited a minute does not write to somebody whose GSTIN was just added.
 */
import { getCandidate, recordGstinRequest, recordGstinWaiting, type Candidate } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  gstinRequestHtml,
  gstinRequestSubject,
  gstinRequestText,
  gstinWaitingHtml,
  gstinWaitingSubject,
  gstinWaitingText,
} from "@/lib/emailTemplates";
import { gstinWaitingRefusal } from "@/lib/pan";
import { siteConfig } from "@/config/site";

/** Below this, a second one is refused as a double click. */
const MIN_GAP_MS = 60_000;

export type GstinWaitingOutcome = { ok: true; candidate: Candidate } | { ok: false; reason: string };

/** "GSTIN needed" — the first ask (or another one). */
export async function sendGstinRequestEmail(
  id: string,
  opts: { by?: string; override?: boolean } = {},
): Promise<GstinWaitingOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };

  const refusal = gstinWaitingRefusal(candidate);
  if (refusal) return { ok: false, reason: refusal };

  const last = candidate.gstinRequests?.at(-1);
  if (last && Date.now() - Date.parse(last) < MIN_GAP_MS) return { ok: false, reason: "too_soon" };

  const email = (candidate.email || "").trim();
  const payload = { fullName: candidate.confirmedDetails?.firstName || candidate.fullName || "Candidate" };
  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: gstinRequestSubject(),
    html: gstinRequestHtml(payload),
    text: gstinRequestText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
    override: opts.override,
  });
  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[gstin] request to ${id} not sent: ${reason}`);
    return { ok: false, reason };
  }

  const updated = await recordGstinRequest(id);
  if (!updated) return { ok: false, reason: "not_found" };
  // eslint-disable-next-line no-console
  console.log(`[gstin] GSTIN requested from ${id}${opts.by ? ` by ${opts.by}` : ""}`);
  return { ok: true, candidate: updated };
}

export async function sendGstinWaitingEmail(
  id: string,
  opts: { by?: string; override?: boolean } = {},
): Promise<GstinWaitingOutcome> {
  const candidate = await getCandidate(id);
  if (!candidate) return { ok: false, reason: "not_found" };

  const refusal = gstinWaitingRefusal(candidate);
  if (refusal) return { ok: false, reason: refusal };

  const last = candidate.gstinWaitingEmails?.at(-1)?.at;
  if (last && Date.now() - Date.parse(last) < MIN_GAP_MS) return { ok: false, reason: "too_soon" };

  const email = (candidate.email || "").trim();
  const payload = { fullName: candidate.confirmedDetails?.firstName || candidate.fullName || "" };
  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: gstinWaitingSubject(),
    html: gstinWaitingHtml(payload),
    text: gstinWaitingText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
    kind: "campaign",
    override: opts.override,
  });
  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[gstin] "place still waiting" to ${id} not sent: ${reason}`);
    return { ok: false, reason };
  }

  const updated = await recordGstinWaiting(id, opts.by);
  if (!updated) return { ok: false, reason: "not_found" };
  // eslint-disable-next-line no-console
  console.log(`[gstin] "place still waiting" sent to ${id}${opts.by ? ` by ${opts.by}` : ""}`);
  return { ok: true, candidate: updated };
}
