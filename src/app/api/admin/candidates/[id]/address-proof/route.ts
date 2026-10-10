import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { getCandidate, setAddressProofApproved, type Candidate } from "@/lib/store";
import { addressProofStatus, addressReaskMessage } from "@/lib/addressProof";
import { ADDRESS_REFUSAL_STATUS, sendAddressProofEmail } from "@/lib/addressProofSend";

/**
 * Recruiter actions on a candidate's proof of address — see lib/addressProof:
 *
 *   request    email the request ("Your agreement is ready — please confirm
 *              your address") with their personal link
 *   reminder   email a reminder, for somebody asked who has not uploaded
 *   reask      email "please send a new document", with the reason, and open
 *              their page again
 *   approve    mark the document on file approved
 *   unapprove  take the approval back
 *
 * Separate from "Full verified" and from the agreement: nothing waits on it.
 */

export const runtime = "nodejs";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/** What the panel needs back to redraw itself. */
function patchOf(c: Candidate) {
  return {
    addressProofRequestedAt: c.addressProofRequestedAt ?? null,
    addressProofReason: c.addressProofReason ?? null,
    addressProofEvents: c.addressProofEvents ?? [],
    addressProofSubmittedAt: c.addressProofSubmittedAt ?? null,
    addressProofSubmissions: c.addressProofSubmissions ?? [],
    addressProofApprovedAt: c.addressProofApprovedAt ?? null,
    addressProofApprovedBy: c.addressProofApprovedBy ?? null,
    addressProofStatus: addressProofStatus(c),
  };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const by = session?.u ?? "admin";
  const { id } = await ctx.params;

  let body: { action?: string; reason?: unknown; custom?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "request" || body.action === "reminder" || body.action === "reask") {
    const reason =
      body.action === "reask"
        ? addressReaskMessage(
            typeof body.reason === "string" ? body.reason : "",
            typeof body.custom === "string" ? body.custom : "",
          )
        : undefined;
    if (body.action === "reask" && !reason) {
      return NextResponse.json({ ok: false, error: "no_reason" }, { status: 400 });
    }
    const result = await sendAddressProofEmail(id, baseUrl(req), { kind: body.action, by, reason });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason },
        { status: ADDRESS_REFUSAL_STATUS[result.reason] ?? 502 },
      );
    }
    return NextResponse.json({ ok: true, ...patchOf(result.candidate) });
  }

  if (body.action === "approve" || body.action === "unapprove") {
    if (body.action === "approve" && addressProofStatus(candidate) !== "received") {
      return NextResponse.json({ ok: false, error: "nothing_to_approve" }, { status: 409 });
    }
    const updated = await setAddressProofApproved(id, body.action === "approve" ? by : null);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[address] ${id} proof of address ${body.action === "approve" ? "approved" : "approval undone"} by ${by}`);
    return NextResponse.json({ ok: true, ...patchOf(updated) });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
