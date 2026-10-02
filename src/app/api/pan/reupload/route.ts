import { NextRequest, NextResponse } from "next/server";
import { readPanReuploadToken } from "@/lib/token";
import { completePanReupload } from "@/lib/store";
import { currentPanDocument, isValidGstin, normaliseGstin } from "@/lib/pan";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildPanReuploadedMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * The re-upload page says it is done. The photos themselves go through the
 * ordinary document routes first; this checks the link, that both sides have
 * arrived since the request, records it, and tells the recruiter on Telegram
 * (once — a second press is answered "ok" and says nothing).
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`pan-reupload:${clientIp(req)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "pan-reupload");

  const parsed = await readJsonBody<{ t?: unknown; gstin?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const read = readPanReuploadToken(typeof parsed.data.t === "string" ? parsed.data.t : "");
  if (!read.ok) {
    return NextResponse.json({ ok: false, error: read.reason }, { status: 403 });
  }
  const { id, sentAt } = read.link;

  const gstin = normaliseGstin(parsed.data.gstin);
  if (gstin && !isValidGstin(gstin)) {
    return NextResponse.json(
      { ok: false, problems: ["This doesn't look like a valid GSTIN — please check it, or leave it empty."] },
      { status: 400 },
    );
  }

  const result = await completePanReupload(id, sentAt, gstin || undefined);
  if (!result.ok) {
    if (result.reason === "incomplete") {
      return NextResponse.json(
        { ok: false, problems: ["Please add both the front and the back of your PAN card."] },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: result.reason === "not_found" ? 404 : 409 },
    );
  }

  if (result.first) {
    const c = result.candidate;
    const noCamera = (["panFront", "panBack"] as const).some(
      (k) => currentPanDocument(c.documents, k)?.camera === false,
    );
    const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    const name =
      c.fullName?.trim() || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || "Candidate";
    void sendTelegramMessage(
      buildPanReuploadedMessage(
        name,
        c.email,
        c.confirmedDetails?.country || c.country || undefined,
        `${base}/admin/accepted`,
        noCamera,
      ),
    ).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[pan] ${id} re-uploaded their PAN card`);
  }
  return NextResponse.json({ ok: true });
}
