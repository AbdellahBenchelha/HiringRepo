import { NextRequest, NextResponse } from "next/server";
import { readAgreementToken } from "@/lib/token";
import { completeAgreement } from "@/lib/store";
import { contractorName } from "@/lib/agreement";
import { sendAgreementReceived } from "@/lib/agreementSend";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildAgreementSignedMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * The agreement page says the signed copy is in. The files themselves go
 * through the ordinary document routes first; this checks the link, that at
 * least one signed file arrived since the agreement was sent, records them,
 * thanks the candidate and tells the recruiter on Telegram — once; a second
 * press is answered ok and says nothing.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`agreement-submit:${clientIp(req)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "agreement-submit");

  const parsed = await readJsonBody<{ t?: unknown; confirmed?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);
  const read = readAgreementToken(typeof parsed.data.t === "string" ? parsed.data.t : "");
  if (!read.ok) return NextResponse.json({ ok: false, error: "invalid" }, { status: 403 });
  if (parsed.data.confirmed !== true) {
    return NextResponse.json(
      { ok: false, problems: ["Please tick the box to confirm you have signed the agreement."] },
      { status: 400 },
    );
  }

  const { id } = read.link;
  const result = await completeAgreement(id, { via: "upload" });
  if (!result.ok) {
    if (result.reason === "no_document") {
      return NextResponse.json(
        { ok: false, problems: ["Your signed agreement did not arrive. Please add the files again and send."] },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: result.reason }, { status: result.reason === "not_found" ? 404 : 409 });
  }

  if (result.first) {
    const c = result.candidate;
    const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    void sendTelegramMessage(
      buildAgreementSignedMessage(
        contractorName(c) || c.email || "Candidate",
        c.email,
        c.confirmedDetails?.country || c.country || undefined,
        `${base}/admin/accepted`,
        c.agreementRef ?? "",
        c.agreementSubmissions?.at(-1)?.keys.length ?? 0,
        (c.agreementSubmissions?.length ?? 0) > 1,
      ),
    ).catch(() => {});
    await sendAgreementReceived(c);
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${id} sent back their signed agreement`);
  }
  return NextResponse.json({ ok: true });
}
