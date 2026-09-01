import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import { getCandidate, recordOffer, setOfferOutcome } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import { offerHtml, offerSubject, offerText } from "@/lib/emailTemplates";
import { siteConfig } from "@/config/site";
import { formatRate, offerProblems, ENGAGEMENT_TYPES, type Offer } from "@/lib/offer";

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

  const payload = {
    fullName: candidate.fullName || "Candidate",
    position: offer.position,
    rate: formatRate(offer),
    engagement: offer.engagement,
    hoursPerWeek: offer.hoursPerWeek,
    startDate: offer.startDate,
    probation: offer.probation,
    note: offer.note,
  };

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: offerSubject(offer.position),
    html: offerHtml(payload),
    text: offerText(payload),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // Nothing is recorded — see the note at the top of this file.
    // eslint-disable-next-line no-console
    console.warn(`[offer] ${id} not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  const updated = await recordOffer(id, offer);
  // eslint-disable-next-line no-console
  console.log(`[offer] ${id} sent to ${email} by ${session?.u ?? "admin"}`);
  return NextResponse.json({
    ok: true,
    status: updated?.status,
    offer: updated?.offer,
    offerSentAt: updated?.offerSentAt,
  });
}
