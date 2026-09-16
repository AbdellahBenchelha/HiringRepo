import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { getCandidate, setOfferOutcome } from "@/lib/store";
import { sendOfferEmail } from "@/lib/candidateEmails";
import { offerProblems, ENGAGEMENT_TYPES, type Offer } from "@/lib/offer";

/**
 * Send a written offer, and record what the candidate said.
 *
 *   send      email the offer and store the exact terms
 *   accepted  they said yes — status becomes Hired
 *   declined  they said no
 *
 * The offer is only recorded if the email actually left. An offer marked sent
 * that never arrived is worse than no record at all: the candidate hears
 * nothing while the panel says they were told.
 */

export const runtime = "nodejs";

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Public base URL for the acceptance link (honours a proxy host). */
function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const { id } = await ctx.params;

  let body: { action?: string; offer?: Record<string, unknown>; reason?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (body.action === "accepted" || body.action === "declined") {
    const updated = await setOfferOutcome(
      id,
      body.action,
      typeof body.reason === "string" ? body.reason : undefined,
    );
    if (!updated) return NextResponse.json({ ok: false, error: "no_offer" }, { status: 409 });
    // eslint-disable-next-line no-console
    console.log(`[offer] ${id} ${body.action} (recorded by ${session?.u ?? "admin"})`);
    return NextResponse.json({
      ok: true,
      status: updated.status,
      offerAcceptedAt: updated.offerAcceptedAt,
      offerDeclinedAt: updated.offerDeclinedAt,
      offerDeclineReason: updated.offerDeclineReason,
    });
  }

  if (body.action !== "send") {
    return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  const raw = body.offer ?? {};
  const offer: Offer = {
    position: typeof raw.position === "string" ? raw.position.trim() : "",
    rate: num(raw.rate) ?? 0,
    currency: typeof raw.currency === "string" ? raw.currency.trim().toUpperCase() : "",
    unit: raw.unit as Offer["unit"],
    hoursPerWeek: num(raw.hoursPerWeek),
    startDate: typeof raw.startDate === "string" && raw.startDate ? raw.startDate : undefined,
    engagement: raw.engagement as Offer["engagement"],
    probation: typeof raw.probation === "string" && raw.probation.trim() ? raw.probation.trim() : undefined,
    note: typeof raw.note === "string" && raw.note.trim() ? raw.note.trim().slice(0, 600) : undefined,
  };

  // Validated here as well as in the form: the form can be bypassed, and a
  // malformed offer would be emailed to a real person.
  const problems = offerProblems(offer);
  if (!ENGAGEMENT_TYPES.includes(offer.engagement)) problems.push("Unknown engagement type.");
  if (problems.length) {
    return NextResponse.json({ ok: false, error: "invalid", problems }, { status: 400 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // The send itself lives in candidateEmails, so this route and a paced batch
  // of a hundred offers build, sign, send and record the same way.
  const result = await sendOfferEmail(id, offer, baseUrl(req));
  if (!result.ok) {
    const status = result.reason === "invalid" ? 400 : result.reason === "not_found" ? 404 : 502;
    return NextResponse.json({ ok: false, error: result.reason }, { status });
  }

  const updated = await getCandidate(id);
  // eslint-disable-next-line no-console
  console.log(`[offer] ${id} sent by ${session?.u ?? "admin"}`);
  return NextResponse.json({
    ok: true,
    status: updated?.status,
    offer: updated?.offer,
    offerSentAt: updated?.offerSentAt,
  });
}
