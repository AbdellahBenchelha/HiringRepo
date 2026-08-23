import { NextRequest, NextResponse } from "next/server";
import { findDuplicates } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Duplicate check run when the applicant finishes Personal Information.
 *
 * This is a separate endpoint because the step-one Telegram notification goes
 * out via navigator.sendBeacon, which discards the response and so cannot
 * answer a question. The form awaits this one before letting the applicant
 * continue.
 *
 * Two outcomes matter to the caller:
 *   emailTaken — the applicant is stopped here; one application per person.
 *   flagged    — the phone matches an earlier application. The applicant
 *                continues normally and notices nothing; the assessment email
 *                is withheld later so a recruiter can compare the two first.
 */

export const runtime = "nodejs";

const MAX_REQUESTS = 40;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const limit = rateLimit(`check:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "applicant-check");

  const parsed = await readJsonBody<{ id?: string; email?: string; phone?: string }>(req, 8 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  const email = typeof parsed.data.email === "string" ? parsed.data.email : "";
  const phone = typeof parsed.data.phone === "string" ? parsed.data.phone : "";

  try {
    const { emailTaken, phoneMatch, resumeId } = await findDuplicates(email, phone, id);
    return NextResponse.json({
      ok: true,
      emailTaken,
      flagged: !!phoneMatch,
      // Name of the earlier applicant, for the recruiter's Telegram warning.
      // Never shown to the applicant — that would leak another person's data.
      matchedName: phoneMatch?.name ?? null,
      matchedId: phoneMatch?.id ?? null,
      // This person's own unfinished attempt. The form switches to it so a
      // restart updates that record instead of creating another one.
      resumeId,
    });
  } catch {
    // Storage trouble must not strand someone mid-application. Let them
    // through; a duplicate is recoverable, a blocked real candidate is not.
    return NextResponse.json({ ok: true, emailTaken: false, flagged: false, resumeId: null });
  }
}
