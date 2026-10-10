import { NextRequest, NextResponse } from "next/server";
import { readAddressProofToken } from "@/lib/token";
import { completeAddressProof, getCandidate } from "@/lib/store";
import {
  addressDiffers,
  addressDocTypeLabel,
  addressOnFile,
  cleanAddress,
  isAddressDocType,
} from "@/lib/addressProof";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { readJsonBody, badBodyResponse } from "@/lib/http";
import { buildAddressProofMessage, sendTelegramMessage } from "@/lib/telegram";

/**
 * The proof-of-address page says it is done. The PDF itself goes through the
 * ordinary document routes first; this checks the link, the answers, that a
 * PDF arrived since the newest request, records it with the address they
 * typed (kept with the proof, never written over confirmedDetails), and tells
 * the recruiter on Telegram — once; a second press is answered ok and says
 * nothing.
 */

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const limit = rateLimit(`address-proof:${clientIp(req)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter, "address-proof");

  const parsed = await readJsonBody<{ t?: unknown; type?: unknown; address?: unknown; confirmed?: unknown }>(
    req,
    4 * 1024,
  );
  if (!parsed.ok) return badBodyResponse(parsed.reason);

  const read = readAddressProofToken(typeof parsed.data.t === "string" ? parsed.data.t : "");
  if (!read.ok) return NextResponse.json({ ok: false, error: "invalid" }, { status: 403 });
  const { id } = read.link;

  const problems: string[] = [];
  const address = cleanAddress(parsed.data.address);
  if (!address) problems.push("Please enter your full address.");
  const type = parsed.data.type;
  if (!isAddressDocType(type)) problems.push("Please choose which document you are submitting.");
  if (parsed.data.confirmed !== true) problems.push("Please tick the box to confirm the document.");
  if (problems.length || !isAddressDocType(type)) {
    return NextResponse.json({ ok: false, problems }, { status: 400 });
  }

  const before = await getCandidate(id);
  if (!before) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const onFile = addressOnFile(before);

  const result = await completeAddressProof(id, { type, address, onFile });
  if (!result.ok) {
    if (result.reason === "no_document") {
      return NextResponse.json(
        { ok: false, problems: ["Your document did not arrive. Please choose the PDF again and submit."] },
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
    const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    const name =
      c.fullName?.trim() || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email || "Candidate";
    const changed = addressDiffers(address, onFile);
    void sendTelegramMessage(
      buildAddressProofMessage(
        name,
        c.email,
        c.confirmedDetails?.country || c.country || undefined,
        `${base}/admin/accepted`,
        addressDocTypeLabel(type),
        { given: address, onFile, changed },
        (c.addressProofSubmissions?.length ?? 0) > 1,
      ),
    ).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[address] ${id} sent their proof of address${changed ? " (address changed)" : ""}`);
  }
  return NextResponse.json({ ok: true });
}
