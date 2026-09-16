import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/http";
import { recordFeedback } from "@/lib/warmupStore";

/**
 * Where ZeptoMail tells us a message bounced or was marked as spam.
 *
 * These two numbers are the ones mailbox providers actually act on, and
 * nothing else in this application can know them: a send that ZeptoMail
 * accepted looks like a success here even when it is rejected by the receiving
 * server a second later, and a person pressing "spam" leaves no trace on our
 * side at all. Without this route the warm-up tab would show a confident green
 * verdict computed from half the evidence, which is worse than showing nothing.
 *
 * Configure in the ZeptoMail console under the Mail Agent's webhooks, pointing
 * at:
 *
 *   https://workroute.co.uk/api/email-feedback?k=<EMAIL_FEEDBACK_SECRET>
 *
 * with EMAIL_FEEDBACK_SECRET set in the host's environment to a long random
 * string. The secret is in the URL rather than a signature because the shape
 * of ZeptoMail's signing is not something this code should guess at; a secret
 * in a URL only ever sent over TLS to one host is weak protection against a
 * leak of that URL and adequate against everything else, and the worst a
 * forged call can do is spoil a statistic.
 *
 * Unset secret means the route refuses everything. An open endpoint that
 * writes to the numbers the sending decisions are made from would be worse
 * than no endpoint at all.
 */

export const runtime = "nodejs";

/** Generous: a provider retrying a burst of bounces is normal behaviour. */
const MAX_REQUESTS = 600;
const WINDOW_MS = 10 * 60 * 1000;

function secretOk(given: string | null): boolean {
  const expected = process.env.EMAIL_FEEDBACK_SECRET?.trim();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Every string in the payload, however deeply it is nested.
 *
 * ZeptoMail's event body is a nested envelope whose exact shape is a matter
 * for their documentation and has changed before. Rather than encode a
 * structure that may not match what actually arrives — and silently record
 * nothing when it does not — this looks for the event name wherever it sits.
 * The cost is a little imprecision; the benefit is that the feature works on
 * the first delivery rather than after a round of guessing.
 */
function stringsIn(value: unknown, depth = 0): string[] {
  if (depth > 6) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap((v) => stringsIn(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      // Keys matter too: some payloads name the event in the key rather than
      // the value.
      [k, ...stringsIn(v, depth + 1)],
    );
  }
  return [];
}

export type Feedback = "bounce" | "complaint" | null;

/**
 * What kind of bad news this is, if any.
 *
 * Complaints are checked first: a message can be both bounced and reported,
 * and a complaint is the more serious signal of the two, so it is the one
 * worth recording.
 */
export function classify(payload: unknown): Feedback {
  const hay = stringsIn(payload)
    .map((s) => s.toLowerCase().replace(/[\s-]+/g, "_"))
    .join(" ");
  if (/spam|complain|abuse/.test(hay)) return "complaint";
  if (/bounce|hardbounce|softbounce|undeliver|invalid_recipient|rejected/.test(hay)) return "bounce";
  return null;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(`email-feedback:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "email-feedback");

  if (!secretOk(req.nextUrl.searchParams.get("k"))) {
    // Deliberately terse and deliberately 404: an endpoint that confirms it
    // exists is an endpoint worth guessing at.
    return new NextResponse("Not found", { status: 404 });
  }

  const parsed = await readJsonBody<unknown>(req, 64 * 1024);
  if (!parsed.ok) return NextResponse.json({ ok: true, recorded: null });

  const kind = classify(parsed.data);
  if (!kind) {
    // Opens and clicks come through here too if they are switched on. Nothing
    // to record — the tab reads engagement from the candidates' own timestamps
    // — but worth logging once so an unrecognised event name is visible rather
    // than silently dropped.
    // eslint-disable-next-line no-console
    console.log(`[email-feedback] ignored an event that is neither a bounce nor a complaint`);
    return NextResponse.json({ ok: true, recorded: null });
  }

  await recordFeedback(kind);
  // eslint-disable-next-line no-console
  console.log(`[email-feedback] recorded a ${kind}`);
  return NextResponse.json({ ok: true, recorded: kind });
}
