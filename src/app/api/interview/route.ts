import { NextRequest, NextResponse } from "next/server";
import { readInterviewToken } from "@/lib/token";
import { interviewQuestions, scoreAnswers } from "@/config/interviewQuestions";
import { buildInterviewResultMessage, sendTelegramMessage } from "@/lib/telegram";
import { recordInterview } from "@/lib/store";

/**
 * Receives an applicant's interview answers, scores the multiple-choice ones,
 * and notifies the recruiter on Telegram with the name + score (+ written
 * answers). Stateless: the identity comes from the signed token.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { token?: string; answers?: Record<string, string> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const identity = readInterviewToken(body.token);
  if (!identity) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
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

  const written = interviewQuestions
    .filter((q) => q.type === "text")
    .map((q) => ({ question: q.question, answer: String(answers[q.id] ?? "").trim() }));

  await sendTelegramMessage(
    buildInterviewResultMessage(identity.name, identity.email, correct, total, written),
  );

  return NextResponse.json({ ok: true, score: { correct, total } });
}
