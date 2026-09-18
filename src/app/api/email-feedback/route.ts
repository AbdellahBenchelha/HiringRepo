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
 *
 * Subscribe Hard bounces and Feedback loop. Soft bounces may be subscribed
 * too — they are now counted apart and kept out of the verdict — but Delivered
 * is only noise here, since a send is already counted as it leaves.
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
 * Where the event names itself.
 *
 * This list is the whole point of the rewrite below. The first version of this
 * route flattened the entire payload — every value *and every key name* — into
 * one string and searched it for the word "bounce". That is wrong in a way
 * that is invisible until you see a real payload, because ZeptoMail puts
 *
 *     "bounce_address": "bounce@…"
 *
 * — the envelope return-path — inside *every* event it sends, delivered and
 * opened and complained-about alike. So every event that was not caught as a
 * complaint first was recorded as a bounce, and the warm-up tab reported a
 * bounce rate of 8.2% against a ZeptoMail console showing none at all. The
 * lesson is narrow and worth keeping: read the field that names the event,
 * never the payload it came wrapped in.
 */
const EVENT_FIELDS = ["event_name", "eventname", "event", "event_type", "action", "actiontype"];

/** Strings directly under a field: ZeptoMail sends `"event_name": ["softbounce"]`. */
function valuesOf(value: unknown, depth = 0): string[] {
  if (typeof value === "string") return [value];
  if (depth > 3 || !Array.isArray(value)) return [];
  return value.flatMap((v) => valuesOf(v, depth + 1));
}

/** Every event name in the payload, wherever in the envelope it sits. */
function eventNames(value: unknown, depth = 0): string[] {
  if (depth > 6 || !value || typeof value !== "object") return [];
  const found: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (EVENT_FIELDS.includes(key.toLowerCase().replace(/[^a-z_]/g, ""))) {
      found.push(...valuesOf(child));
    }
    found.push(...eventNames(child, depth + 1));
  }
  return found;
}

/**
 * ZeptoMail's own event names, which carry no separators: the console's data
 * preview shows `"event_name": ["softbounce"]`, not `soft_bounce`. Names are
 * stripped to letters and digits before matching so either spelling works.
 */
const COMPLAINT = /feedbackloop|spam|complain|abuse/;
const HARD_BOUNCE = /hardbounce|permanentfail|invalidrecipient|undeliver|rejected/;
const SOFT_BOUNCE = /softbounce|temporaryfail|transientfail|deferred|mailboxfull/;

export type Feedback = "bounce" | "softbounce" | "complaint" | null;

/**
 * The console's "Trigger test webhook" button posts a real request to the live
 * URL, and its sample is addressed to Zoho's example domain with a giveaway
 * subject. Counting those as real events means every press while setting the
 * webhook up quietly becomes a bounce on the record.
 */
function isTestPayload(payload: unknown): boolean {
  let json = "";
  try {
    json = JSON.stringify(payload ?? "").toLowerCase();
  } catch {
    return false;
  }
  return json.includes("zylker.com") || json.includes("webhook test email");
}

/**
 * What kind of bad news this is, if any.
 *
 * Complaints are checked first: a message can be both bounced and reported,
 * and a complaint is the more serious signal of the two, so it is the one
 * worth recording. An unrecognised name records nothing — the previous
 * behaviour of guessing from the surrounding payload is exactly what produced
 * a number nobody could reconcile with ZeptoMail's own reporting.
 */
export function classify(payload: unknown): Feedback {
  if (isTestPayload(payload)) return null;
  for (const raw of eventNames(payload)) {
    const name = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (COMPLAINT.test(name)) return "complaint";
    if (HARD_BOUNCE.test(name)) return "bounce";
    if (SOFT_BOUNCE.test(name)) return "softbounce";
    // An event named only "bounce", with nothing saying which kind, is treated
    // as hard: the conservative reading, and the one that errs towards holding
    // volume back rather than sending into a list that may be bad.
    if (/bounce/.test(name)) return "bounce";
  }
  return null;
}

/** For the log line, so an unrecognised event is identifiable rather than a mystery. */
export function describeEvent(payload: unknown): string {
  const names = eventNames(payload);
  return names.length ? names.join(", ") : "no event_name field";
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

  // The event name goes in the log either way. When these figures and
  // ZeptoMail's own reporting disagree again, this line is what settles it in
  // one look instead of a round of guessing.
  const event = describeEvent(parsed.data);
  const kind = classify(parsed.data);

  if (!kind) {
    // Deliveries, opens and clicks come through here too if they are switched
    // on, as do the console's test payloads. Nothing to record — the tab reads
    // engagement from the candidates' own timestamps.
    // eslint-disable-next-line no-console
    console.log(`[email-feedback] ignored "${event}" — not a bounce or a complaint`);
    return NextResponse.json({ ok: true, recorded: null });
  }

  await recordFeedback(kind);
  // eslint-disable-next-line no-console
  console.log(`[email-feedback] recorded "${event}" as a ${kind}`);
  return NextResponse.json({ ok: true, recorded: kind });
}
