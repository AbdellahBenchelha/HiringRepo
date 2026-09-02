import { NextRequest, NextResponse } from "next/server";
import { readOfferToken } from "@/lib/token";
import { acceptOfferWithDetails, declineOfferByCandidate, type OfferAnswerResult } from "@/lib/store";
import { validateConfirmed } from "@/lib/hiring";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

/**
 * A candidate's own answer to their offer, from the link in the email.
 *
 * Public — there is no session here, and there cannot be one: the candidate
 * has no account. The signed token is the whole authorisation, so everything
 * else is defence: the token is verified before the body is read, the details
 * are re-validated server-side (the form's checks are a courtesy to the
 * candidate, not a control), and the write itself re-checks that this offer is
 * still the current one and still unanswered.
 *
 * Nothing here is a GET. Mail scanners fetch every link in an email, so an
 * acceptance that could happen on a GET would be triggered by Outlook rather
 * than by a person — offers would show as accepted that nobody had read.
 */

export const runtime = "nodejs";

/** Generous: a real candidate does this once, but may fumble the form. */
const MAX_PER_IP = 20;
const WINDOW_MS = 10 * 60 * 1000;

/** What the candidate is told, per reason the write refused. */
const REFUSAL: Record<Exclude<OfferAnswerResult, { ok: true }>["reason"], { status: number; error: string }> = {
  not_found: { status: 404, error: "not_found" },
  no_offer: { status: 409, error: "no_offer" },
  superseded: { status: 409, error: "superseded" },
  already_answered: { status: 409, error: "already_answered" },
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limit = rateLimit(`offer-confirm:${ip}`, MAX_PER_IP, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, `offer/confirm from ${ip}`);

  const parsed = await readJsonBody<{
    token?: string;
    action?: string;
    reason?: string;
    details?: Record<string, unknown>;
  }>(req, 16 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  const token = readOfferToken(typeof body.token === "string" ? body.token : "");
  if (!token.ok) {
    return NextResponse.json({ ok: false, error: token.reason }, { status: 403 });
  }
  const { id, offerSentAt } = token.link;

  if (body.action === "decline") {
    const result = await declineOfferByCandidate(
      id,
      offerSentAt,
      typeof body.reason === "string" ? body.reason : undefined,
    );
    if (!result.ok) {
      const { status, error } = REFUSAL[result.reason];
      return NextResponse.json({ ok: false, error }, { status });
    }
    // eslint-disable-next-line no-console
    console.log(`[offer] ${id} declined by the candidate`);
    void notify(`❌ <b>Offer declined</b>\n${escapeHtml(result.candidate.fullName || id)}${
      result.candidate.offerDeclineReason
        ? `\n\nReason: ${escapeHtml(result.candidate.offerDeclineReason)}`
        : ""
    }`);
    return NextResponse.json({ ok: true, outcome: "declined" });
  }

  if (body.action !== "accept") {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  const check = validateConfirmed(body.details ?? {});
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: "invalid", problems: check.problems }, { status: 400 });
  }

  const result = await acceptOfferWithDetails(id, offerSentAt, check.details);
  if (!result.ok) {
    const { status, error } = REFUSAL[result.reason];
    return NextResponse.json({ ok: false, error }, { status });
  }

  // eslint-disable-next-line no-console
  console.log(`[offer] ${id} accepted by the candidate, details confirmed`);
  const d = check.details;
  void notify(
    `✅ <b>Offer accepted</b>\n` +
      `<b>${escapeHtml(`${d.firstName} ${d.lastName}`)}</b>\n` +
      `${escapeHtml(result.candidate.position || "")}\n\n` +
      `Engaged as: ${escapeHtml(d.engagedAs)}` +
      (d.companyName ? ` — ${escapeHtml(d.companyName)}` : "") +
      `\nDetails confirmed and ready to review in the Accepted tab.`,
  );

  return NextResponse.json({ ok: true, outcome: "accepted" });
}

/**
 * Tell the recruiter, without letting it affect the answer.
 *
 * The acceptance is already stored by the time this runs. A Telegram outage
 * must not turn a successful acceptance into an error the candidate sees and
 * retries.
 */
async function notify(text: string): Promise<void> {
  try {
    await sendTelegramMessage(text);
  } catch {
    /* the record is what matters */
  }
}
