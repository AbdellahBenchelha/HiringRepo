import { NextRequest, NextResponse } from "next/server";
import { recordResidenceExplanation } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { MAX_EXPLANATION } from "@/lib/residence";

/**
 * A candidate saying, in their own words, why they live where they live.
 *
 * The alternative to a residence permit, for the people who genuinely do not
 * have one — students, dependants, anyone mid-application, anyone in a country
 * that does not issue a card at all. Without this the honest answer to "send
 * your permit" would be silence, and silence is indistinguishable from
 * evasion.
 *
 * Public, like the uploads, because the candidate has no account and the
 * candidate id in their emailed link is the whole of what they hold. That id
 * is not a secret worth much, so the store refuses to write unless a recruiter
 * has actually asked this person for proof and has not yet decided: the window
 * is opened by a recruiter and closed by one, and outside it this route can
 * change nothing.
 *
 * The recruiter reads it and decides. Nothing here accepts or rejects
 * anything, and an explanation is never proof on its own.
 */

export const runtime = "nodejs";

/** A person writes this once and may rewrite it once or twice. */
const MAX_PER_IP = 10;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`residence-explain:${clientIp(req)}`, MAX_PER_IP, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "residence-explanation");

  const parsed = await readJsonBody<{ id?: unknown; explanation?: unknown }>(req, 8 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!/^[A-Za-z0-9]{1,32}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const text = typeof parsed.data.explanation === "string" ? parsed.data.explanation.trim() : "";
  if (!text) {
    return NextResponse.json({ ok: false, error: "explanation_required" }, { status: 400 });
  }
  if (text.length > MAX_EXPLANATION) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const result = await recordResidenceExplanation(id, text);
  if (!result.ok) {
    // 404 for every refusal, deliberately. "That candidate exists but has not
    // been asked" is a fact worth nothing to a candidate and something to
    // somebody guessing ids.
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // eslint-disable-next-line no-console
  console.log(`[residence] ${id} explained why they have no permit`);
  return NextResponse.json({ ok: true });
}
