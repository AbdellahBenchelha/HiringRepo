import { NextRequest, NextResponse } from "next/server";
import { readInterviewToken } from "@/lib/token";
import { scoreAnswers } from "@/config/interviewQuestions";
import { buildInterviewResultMessage, sendTelegramMessage } from "@/lib/telegram";
import { recordInterview, getCandidate } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Receives an applicant's interview answers, scores the multiple-choice ones,
 * and notifies the recruiter on Telegram with the name, email, country and
 * score. The answers themselves are saved for the Admin Panel and are not sent
 * to Telegram. The identity comes from the short candidate id (preferred) or a
 * legacy signed token.
 */

export const runtime = "nodejs";

/** Each candidate submits once; the allowance covers retries and typos. */
const MAX_REQUESTS = 30;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`interview:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "interview");

  const parsed = await readJsonBody<{
    id?: string;
    token?: string;
    answers?: Record<string, string>;
  }>(req, 64 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const body = parsed.data;

  let identity: { id?: string; name: string; email?: string; country?: string } | null = null;
  let alreadyCompleted = false;
  if (body.id) {
    const cand = await getCandidate(body.id);
    if (cand) {
      identity = {
        id: cand.id,
        name: cand.fullName,
        email: cand.email || undefined,
        country: cand.country || undefined,
      };
      alreadyCompleted = !!cand.interview;
    }
  }
  if (!identity && body.token) {
    identity = readInterviewToken(body.token);
    if (identity?.id) {
      const cand = await getCandidate(identity.id);
      if (cand?.interview) alreadyCompleted = true;
      // The token carries no country; take it from the record when there is one.
      if (cand?.country) identity = { ...identity, country: cand.country };
    }
  }
  if (!identity) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  // Already submitted — do not record again or re-send Telegram.
  if (alreadyCompleted) {
    return NextResponse.json({ ok: false, error: "already_completed" }, { status: 409 });
  }

  const answers = body.answers ?? {};
  const { correct, total } = scoreAnswers(answers);

  // Save the result for the Admin Panel (best-effort; never blocks Telegram).
  if (identity.id) {
    try {
      await recordInterview(identity.id, { score: correct, total, answers });
    } catch {
      /* storage is best-effort */
    }
  }

  await sendTelegramMessage(
    buildInterviewResultMessage(
      identity.name,
      identity.email,
      identity.country,
      correct,
      total,
    ),
  );

  return NextResponse.json({ ok: true, score: { correct, total } });
}
