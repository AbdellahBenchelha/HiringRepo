import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import {
  clearResidenceImages,
  getCandidate,
  requestResidenceProof,
  setResidenceDecision,
  type Candidate,
} from "@/lib/store";
import { deleteObjects } from "@/lib/r2";
import { sendEmail } from "@/lib/email";
import {
  residenceRequestHtml,
  residenceRequestSubject,
  residenceRequestText,
} from "@/lib/emailTemplates";
import { residenceMessage } from "@/lib/residence";
import { createOfferToken } from "@/lib/token";
import { campaignBlocked } from "@/lib/warmupStore";
import { siteConfig } from "@/config/site";

/**
 * Recruiter actions on a candidate's proof of residence.
 *
 *   request        ask for a permit, with a country and a reason
 *   verify/reject  record the decision on what came back
 *   clear-images   forget the photographs, keep the decision
 *
 * There is no separate "reupload" action, unlike the identity route. Asking a
 * second time for proof of residence is the same act as asking the first
 * time — the same two photographs, for the same country, with a reason that
 * may well be the same one — so `request` covers both and the store works out
 * which it is. The identity check splits them because there the first request
 * and the second speak to people at genuinely different points; here they do
 * not.
 */

export const runtime = "nodejs";

function baseUrl(req: NextRequest): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Where to send them to upload.
 *
 * Their offer link when they have a live offer, because that is the page they
 * are actually on; the assessment link otherwise. The same rule the identity
 * re-request uses, and for the same reason — this is usually asked after an
 * offer, since the acceptance form is where the two countries first appear
 * side by side.
 *
 * `step=residence` is the important part. Both of those pages show whichever
 * step is outstanding, and a candidate can easily owe two at once — new
 * identity photographs and a residence permit. Without the marker the page
 * picks for itself, and somebody who opened an email headed "send your
 * residence permit" is shown a form asking for a passport instead. The marker
 * says which request brought them here, so the page can honour it.
 */
function uploadUrlFor(c: Candidate, base: string): string {
  if (c.offerSentAt && c.offer) {
    const token = createOfferToken({ id: c.id, offerSentAt: c.offerSentAt });
    return `${base}/offer?t=${encodeURIComponent(token)}&step=residence`;
  }
  return `${base}/interview?c=${c.id}&step=residence`;
}

/** What country to name, when the recruiter did not say. */
function countryFor(c: Candidate, given: unknown): string {
  if (typeof given === "string" && given.trim()) return given.trim().slice(0, 100);
  return (c.confirmedDetails?.country || c.country || "").trim();
}

/**
 * One candidate's written explanation, handed over on request.
 *
 * Its own route rather than a field on the candidate view, for the reason the
 * SSN has one: the view is built for every row of every table, and a
 * paragraph in which somebody describes their immigration status is not
 * something to send forty copies of to a browser that renders none of them.
 *
 * The panel fetches it as it opens, so a recruiter still simply sees it —
 * making them press a button to read the one thing they have to judge would
 * mean nobody read it.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json(
    { ok: true, explanation: candidate.residenceExplanation ?? "" },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } },
  );
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const session = await getAdminSession();
  const { id } = await ctx.params;

  let body: { action?: string; reason?: string; customReason?: string; country?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const by = session?.u ?? "admin";

  /* ---------------------------------------------------------------------- */
  /* The decision                                                            */
  /* ---------------------------------------------------------------------- */

  if (body.action === "verify" || body.action === "reject") {
    const updated = await setResidenceDecision(
      id,
      body.action,
      by,
      typeof body.reason === "string" ? body.reason : undefined,
    );
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[residence] ${id} ${body.action}ed by ${by}`);
    return NextResponse.json({
      ok: true,
      residenceVerifiedAt: updated.residenceVerifiedAt,
      residenceRejectedAt: updated.residenceRejectedAt,
      residenceRejectionReason: updated.residenceRejectionReason,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* The ask                                                                 */
  /* ---------------------------------------------------------------------- */

  if (body.action === "request") {
    const message = residenceMessage(body.reason ?? "", body.customReason);
    if (!message) {
      return NextResponse.json({ ok: false, error: "reason_required" }, { status: 400 });
    }

    // Checked before the write. A request recorded while the email is held
    // back by the warm-up cap leaves a candidate marked as asked who was
    // never told — and this is a step nobody discovers on their own, because
    // it did not exist when they last looked at their link.
    if (await campaignBlocked()) {
      return NextResponse.json({ ok: false, error: "warmup_limit" }, { status: 429 });
    }

    // Read first, so the country defaults from the record rather than from
    // whatever the panel happened to have loaded.
    const existing = await getCandidate(id);
    if (!existing) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const country = countryFor(existing, body.country);

    const updated = await requestResidenceProof(id, country, message);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(
      `[residence] ${id} proof requested by ${by} for ${country || "an unnamed country"} (${
        body.reason ?? "custom"
      })`,
    );

    const email = (updated.email || "").trim();
    let emailed = false;
    let emailError: string | undefined;
    if (email.includes("@")) {
      const payload = {
        fullName: updated.fullName || "Candidate",
        url: uploadUrlFor(updated, baseUrl(req)),
        reason: message,
        country: country || undefined,
      };
      const result = await sendEmail({
        to: email,
        toName: updated.fullName || undefined,
        subject: residenceRequestSubject(),
        html: residenceRequestHtml(payload),
        text: residenceRequestText(payload),
        replyTo: siteConfig.contact.recruitmentEmail,
        kind: "campaign",
      });
      emailed = result.ok;
      if (!result.ok) {
        emailError = "skipped" in result ? result.skipped : result.error;
        // The request stands either way — a mail failure must not silently
        // undo it — but the recruiter has to know nobody was told.
        // eslint-disable-next-line no-console
        console.warn(`[residence] ${id} requested but email not sent: ${emailError}`);
      }
    } else {
      emailError = "no_email";
    }

    return NextResponse.json({
      ok: true,
      residenceRequestedAt: updated.residenceRequestedAt,
      residenceCountry: updated.residenceCountry,
      emailed,
      emailError,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Forgetting the photographs                                              */
  /* ---------------------------------------------------------------------- */

  if (body.action === "clear-images") {
    const keys = await clearResidenceImages(id);
    if (keys.length) await deleteObjects(keys).catch(() => {});
    // eslint-disable-next-line no-console
    console.log(`[residence] ${id} permit photographs cleared by ${by} (${keys.length})`);
    return NextResponse.json({ ok: true, removed: keys.length });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}
