/**
 * SERVER-ONLY. "Your place is waiting for you — send us your GSTIN when
 * ready", sent the same way from the View info button and from a paced batch
 * on the Accepted tab.
 *
 * Checked again at the moment of sending, so a batch that waited a minute
 * does not write to somebody whose GSTIN has just been added.
 */
import { getCandidate, recordGstinWaiting, type Candidate } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { gstinWaitingHtml, gstinWaitingSubject, gstinWaitingText } from "@/lib/emailTemplates";
import { gstinWaitingRefusal } from "@/lib/pan";
import { siteConfig } from "@/config/site";

/** Below this, a second one is refused as a double click. */
const MIN_GAP_MS = 60_000;

export type GstinWaitingOutcome = { ok: true; candidate: Candidate } | { ok: false; reason: string };

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
