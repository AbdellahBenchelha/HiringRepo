import { NextRequest, NextResponse } from "next/server";
import {
  buildPersonalMessage,
  buildSubmittedMessage,
  escapeHtml,
  sendTelegramMessage,
} from "@/lib/telegram";
import { getNotificationSettings } from "@/lib/notificationSettings";
import { requiredCountries } from "@/lib/verificationStore";
import { verificationApplies } from "@/lib/verification";
import { getCandidate } from "@/lib/store";
import { createInterviewToken } from "@/lib/token";
import { upsertPersonal, flagDuplicate } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { withSource } from "@/lib/followUp";

/**
 * Telegram notification endpoint used by the application form.
 *
 * "personal"  — sent when the applicant completes the Personal Information step.
 *               The message also includes a generated interview link the
 *               recruiter can forward to the applicant.
 * "submitted" — sent when the applicant submits the completed form.
 *
 * Both messages go out through this single endpoint so they share the exact
 * same, known-working delivery path.
 */

export const runtime = "nodejs";

/**
 * Budgets are per IP and per notification type, because the two are not
 * equally cheap to trigger and are not equally important.
 *
 * Sizing assumes shared addresses: mobile carriers and offices put many real
 * applicants behind one IP, so a tight limit silently drops genuine
 * applications — a far worse outcome than the spam it prevents. A sustained
 * flood still gets stopped.
 *
 * "submitted" only fires after a full form with every consent ticked, so it is
 * both the hardest to trigger and the one the recruiter must never miss. It
 * gets the larger allowance. "personal" fires at step one, which is cheap to
 * reach, so it is held tighter.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMITTED = 40;
const MAX_PERSONAL = 20;

/**
 * Backstop against a raw flood, checked before the body is parsed.
 *
 * It must sit far above the per-type budgets rather than level with them. A
 * shared bucket sized at their sum would let heavy "personal" traffic exhaust
 * it and block a legitimate "submitted" — reintroducing the cross-type
 * starvation the split budgets exist to prevent. At this height the per-type
 * limits always bind first, and this only catches genuine abuse.
 */
const MAX_OVERALL = 200;

type Payload =
  | { type: "submitted"; id?: string; name?: string; suspectedBot?: boolean }
  | {
      type: "personal";
      id?: string;
      fields?: Record<string, unknown>;
      duplicateOfId?: string;
      duplicateOfName?: string;
    };

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Public base URL for building absolute links (honours a proxy host). */
function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Whether this particular notification should be held back.
 *
 * Reads the country and number from the payload for a step-one message, and
 * from the stored record for a submission — by then the candidate exists, and
 * the record is a better source than anything the browser re-sends.
 */
async function shouldStayQuiet(payload: Payload): Promise<boolean> {
  if (payload.type !== "personal" && payload.type !== "submitted") return false;
  const { quietUntilAssessment } = await getNotificationSettings();
  if (!quietUntilAssessment) return false;

  const required = await requiredCountries();

  if (payload.type === "personal") {
    const fields = payload.fields ?? {};
    return verificationApplies({ country: str(fields.country), phone: str(fields.phone) }, required);
  }

  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) return false;
  const candidate = await getCandidate(id);
  if (!candidate) return false;
  return verificationApplies(candidate, required);
}

export async function POST(req: NextRequest) {
  // Coarse guard before any parsing, so a raw flood costs almost nothing.
  const ipEarly = clientIp(req);
  const overall = rateLimit(`telegram:all:${ipEarly}`, MAX_OVERALL, WINDOW_MS);
  if (!overall.ok) return tooManyRequests(overall.retryAfter, `telegram/all from ${ipEarly}`);

  // Then read the body so the budget can be chosen by notification type.
  const parsed = await readJsonBody<Payload>(req, 32 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const payload = parsed.data;

  const ip = clientIp(req);
  const isSubmitted = payload.type === "submitted";
  const limit = rateLimit(
    `telegram:${payload.type}:${ip}`,
    isSubmitted ? MAX_SUBMITTED : MAX_PERSONAL,
    WINDOW_MS,
  );
  if (!limit.ok) return tooManyRequests(limit.retryAfter, `telegram/${payload.type} from ${ip}`);

  let text: string | null = null;
  if (payload.type === "submitted") {
    text = buildSubmittedMessage(payload.name, payload.suspectedBot === true);
  } else if (payload.type === "personal") {
    const fields = payload.fields ?? {};
    const base = buildPersonalMessage(fields);
    if (base) {
      const fullName = `${str(fields.firstName)} ${str(fields.lastName)}`.trim() || "Candidate";
      const id = typeof payload.id === "string" && payload.id ? payload.id : undefined;

      // Persist the candidate for the Admin Panel (best-effort, never blocks).
      if (id) {
        try {
          await upsertPersonal({
            id,
            firstName: str(fields.firstName),
            lastName: str(fields.lastName),
            dob: str(fields.dob),
            email: str(fields.email),
            phone: str(fields.phone),
            country: str(fields.country),
            city: str(fields.city),
            address: str(fields.address),
            linkedin: str(fields.linkedin),
          });
        } catch {
          /* storage is best-effort */
        }

        // Record the duplicate flag after the upsert, so it is not overwritten
        // by the object assignment above.
        if (payload.duplicateOfId) {
          try {
            await flagDuplicate(id, payload.duplicateOfId, payload.duplicateOfName || "Unknown");
          } catch {
            /* storage is best-effort */
          }
        }
      }

      // Short link using the candidate's unguessable id; fall back to a signed
      // token if no id is available.
      const link = id
        ? withSource(`${baseUrl(req)}/interview?c=${id}`, "recruiter")
        : `${baseUrl(req)}/interview?id=${createInterviewToken({ name: fullName, email: str(fields.email) || undefined })}`;

      // A flagged application gets no automatic assessment email, so the
      // recruiter has to be told — otherwise the candidate waits on an inbox
      // that will stay empty and nobody knows why.
      const warning = payload.duplicateOfName
        ? `\n\n⚠️ <b>Possible duplicate</b> — same phone number as <b>${escapeHtml(payload.duplicateOfName)}</b>.\nThe assessment email was <b>not</b> sent automatically. Compare both in the Admin Panel, then use “Send assessment link” to release it.`
        : "";

      text = `${base}\n\n📝 <b>Interview link — send this to the applicant:</b>\n${link}${warning}`;
    }
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  /**
   * Stay quiet about applicants who owe an identity check until they finish.
   *
   * Only the message is held back. The candidate was still saved above — the
   * step-one notification is what creates their record, and skipping that
   * would lose the application entirely rather than just the ping.
   *
   * Assessment results are sent whatever this says; they are handled by
   * /api/interview, which does not consult this at all.
   */
  const quiet = await shouldStayQuiet(payload);
  if (quiet) {
    // Logged, because a notification that silently never arrives is
    // indistinguishable from Telegram being broken.
    // eslint-disable-next-line no-console
    console.log(`[telegram] type=${payload.type} suppressed: awaiting ID verification`);
    return NextResponse.json({ ok: true, skipped: "quiet_until_assessment" });
  }

  const result = await sendTelegramMessage(text);
  // eslint-disable-next-line no-console
  console.log(`[telegram] type=${payload.type} result=${JSON.stringify(result)}`);
  if (result.ok) {
    return NextResponse.json({ ok: true });
  }
  if ("skipped" in result) {
    return NextResponse.json({ ok: false, skipped: result.skipped });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
}
