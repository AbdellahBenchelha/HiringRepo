import { NextRequest, NextResponse } from "next/server";
import { recordVerificationConsent, setIdentityDocumentType } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { isIdDocumentType } from "@/lib/identityDocuments";

/**
 * Record that the candidate ticked the identity-processing consent box, and
 * which document they are about to send.
 *
 * Separate from the upload itself so the timestamp exists even if a photo then
 * fails to send. A face photograph used to confirm identity is biometric data,
 * and being able to show when consent was given is the point of collecting it
 * separately from the general application declarations.
 *
 * The document type rides along here rather than on the uploads because it has
 * to be recorded once for the set, not once per photograph — and because it
 * decides how many photographs the set contains, so it must be on record
 * before the first one lands.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`verify-consent:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "verification-consent");

  const parsed = await readJsonBody<{ id?: string; documentType?: unknown }>(req, 2 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const id = typeof parsed.data.id === "string" ? parsed.data.id : "";
  if (!/^[A-Za-z0-9]{1,32}$/.test(id)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // An unrecognised type is dropped rather than rejected. Consent is the thing
  // that must be recorded here, and failing the whole call over a value we
  // could not read would lose it over a detail.
  const type = parsed.data.documentType;
  if (isIdDocumentType(type)) await setIdentityDocumentType(id, type);

  await recordVerificationConsent(id);
  return NextResponse.json({ ok: true });
}
