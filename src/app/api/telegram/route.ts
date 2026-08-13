import { NextRequest, NextResponse } from "next/server";
import { buildPersonalMessage, buildSubmittedMessage, sendTelegramMessage } from "@/lib/telegram";
import { createInterviewToken } from "@/lib/token";
import { upsertPersonal } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

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
 * A genuine applicant triggers this twice (personal step, then submit). The
 * budget is deliberately loose enough for a shared office IP but tight enough
 * that nobody can flood the recruiter's phone or fill the candidate store.
 */
const MAX_REQUESTS = 12;
const WINDOW_MS = 10 * 60 * 1000;

type Payload =
  | { type: "submitted"; name?: string }
  | { type: "personal"; id?: string; fields?: Record<string, unknown> };

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

export async function POST(req: NextRequest) {
  const limit = rateLimit(`telegram:${clientIp(req)}`, MAX_REQUESTS, WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonBody<Payload>(req, 32 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const payload = parsed.data;

  let text: string | null = null;
  if (payload.type === "submitted") {
    text = buildSubmittedMessage(payload.name);
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
      }

      // Short link using the candidate's unguessable id; fall back to a signed
      // token if no id is available.
      const link = id
        ? `${baseUrl(req)}/interview?c=${id}`
        : `${baseUrl(req)}/interview?id=${createInterviewToken({ name: fullName, email: str(fields.email) || undefined })}`;
      text = `${base}\n\n📝 <b>Interview link — send this to the applicant:</b>\n${link}`;
    }
  }

  if (!text) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
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
