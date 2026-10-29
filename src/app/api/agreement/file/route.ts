import { NextRequest, NextResponse } from "next/server";
import { readAgreementToken } from "@/lib/token";
import { getCandidate } from "@/lib/store";
import { contractorName } from "@/lib/agreement";
import { sentAgreementPdf } from "@/lib/agreementSend";
import { agreementFileName } from "@/lib/agreementEmails";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * The agreement that was sent, opened from the candidate's page — the same
 * PDF that was attached to the email. The link in the email is the key.
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = rateLimit(`agreement-file:${clientIp(req)}`, 30, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "agreement-file");

  const read = readAgreementToken(req.nextUrl.searchParams.get("t"));
  if (!read.ok) return NextResponse.json({ ok: false, error: "invalid" }, { status: 403 });
  const candidate = await getCandidate(read.link.id);
  if (!candidate?.agreementSentAt) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const doc = await sentAgreementPdf(candidate);
  if (!doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return new NextResponse(Buffer.from(doc.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${agreementFileName(contractorName(candidate))}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
