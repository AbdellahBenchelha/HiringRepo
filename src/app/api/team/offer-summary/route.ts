import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/teamAuth";
import { getCandidate } from "@/lib/store";
import { effectiveOffer } from "@/lib/offer";
import { offerSummaryPdf } from "@/lib/teamPdf";

/** A summary of the offer the member accepted, and their terms in the portal. */

export const runtime = "nodejs";

export async function GET() {
  const s = await getMemberSession();
  if (!s) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const c = s.member.candidateId ? await getCandidate(s.member.candidateId) : null;
  const pdf = await offerSummaryPdf(s.member, c?.offer ? effectiveOffer(c.offer) : undefined, c?.offerAcceptedAt);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="workroute-offer-summary.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
