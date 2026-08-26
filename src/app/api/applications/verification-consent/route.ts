import { NextRequest, NextResponse } from "next/server";
import { recordVerificationConsent } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";

/**
 * Record that the candidate ticked the identity-processing consent box.
 *
 * Separate from the upload itself so the timestamp exists even if a photo then
 * fails to send. A face photograph used to confirm identity is biometric data,
 * and being able to show when consent was given is the point of collecting it
 * separately from the general application declarations.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`verify-consent:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "verification-consent");

  const parsed = await readJsonBody<{ id?: string }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!/^[A-Za-z0-9]{1,32}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  await recordVerificationConsent(id);
  return NextResponse.json({ ok: true });
}
