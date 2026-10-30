import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest, getAdminSession } from "@/lib/adminAuth";
import {
  addDocument,
  completeAgreement,
  getCandidate,
  setAgreementApproved,
  setAgreementStartDate,
  setAvailabilityByRecruiter,
  type Candidate,
} from "@/lib/store";
import {
  MAX_SIGNED_FILES,
  agreementMissing,
  agreementReaskMessage,
  agreementStatus,
  contractorName,
  readStartDate,
} from "@/lib/agreement";
import {
  AGREEMENT_REFUSAL_STATUS,
  agreementVersionPdf,
  draftAgreement,
  sendAgreementEmail,
  sentAgreementPdf,
} from "@/lib/agreementSend";
import { agreementFileName } from "@/lib/agreementEmails";
import { putObject, r2Configured } from "@/lib/r2";
import { scanDocument } from "@/lib/documentScan";
import {
  MAX_SIGNED_AGREEMENT_BYTES,
  extensionOf,
  isAllowedForKind,
  safeFilename,
} from "@/lib/documents";
import { newId } from "@/lib/id";
import { createHash } from "node:crypto";
import { validateAvailability } from "@/lib/availability";

/**
 * Recruiter actions on a candidate's final agreement — see lib/agreement.
 *
 *   GET  ?preview=1   the agreement as it would be drawn up now (PDF)
 *   GET  ?file=sent   the exact agreement that was emailed (PDF)
 *   GET  ?file=version&at=…        an earlier version, replaced by a newer one
 *   GET  ?preview=1&start=yyyy-mm-dd  the agreement as it would be with a new start date
 *
 *   POST { action }   JSON:
 *     send       draw it up and email it, with their upload link
 *     reminder   email it again, for somebody who has not sent it back
 *     update     { date } a new version with a new start date, emailed in place
 *                of the one they have not signed yet
 *     reask      "please send it again", with the reason
 *     approve    accept the signed copy on file
 *     unapprove  take the acceptance back
 *     startDate  { date } the start date for the agreement, when the offer
 *                has none (or a new one); used from the next copy sent
 *     availability { availability: {startTime, timeZone, days} } work hours and
 *                days, for somebody who accepted without choosing them —
 *                before the agreement is sent
 *
 *   POST multipart    action=signed, files=… — a signed copy that came back by
 *                     email, uploaded by the recruiter
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
    agreementStartDate: c.agreementStartDate ?? null,
    availability: c.availability ?? null,
    availabilitySetBy: c.availabilitySetBy ?? null,
    agreementSentAt: c.agreementSentAt ?? null,
    agreementRef: c.agreementRef ?? null,
    agreementReason: c.agreementReason ?? null,
    agreementEvents: c.agreementEvents ?? [],
    agreementSignedAt: c.agreementSignedAt ?? null,
    agreementSubmissions: c.agreementSubmissions ?? [],
    agreementApprovedAt: c.agreementApprovedAt ?? null,
    agreementApprovedBy: c.agreementApprovedBy ?? null,
    agreementStatus: agreementStatus(c),
    agreementMissing: agreementMissing(c),
    documents: c.documents ?? [],
  };
}

function pdfResponse(pdf: Uint8Array, name: string) {
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const name = agreementFileName(contractorName(candidate));

  const q = req.nextUrl.searchParams;
  if (q.get("file") === "sent") {
    const doc = await sentAgreementPdf(candidate);
    if (!doc) return NextResponse.json({ ok: false, error: "not_sent" }, { status: 404 });
    return pdfResponse(doc.pdf, name);
  }
  if (q.get("file") === "version") {
    const doc = await agreementVersionPdf(candidate, q.get("at") ?? "");
    if (!doc) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return pdfResponse(doc.pdf, `REPLACED-${doc.ref}-${name}`);
  }
  // A new start date to look at before sending it.
  const start = q.get("start");
  const startDate = start ? readStartDate(start) : undefined;
  if (start && !startDate) return NextResponse.json({ ok: false, error: "bad_date" }, { status: 400 });
  const missing = agreementMissing(startDate ? { ...candidate, agreementStartDate: startDate } : candidate).filter(
    (m) => !m.startsWith("the candidate is not Full verified"),
  );
  if (missing.length) {
    return NextResponse.json({ ok: false, error: "missing", missing }, { status: 409 });
  }
  const doc = await draftAgreement(candidate, new Date().toISOString(), undefined, startDate ?? undefined);
  if (!doc) return NextResponse.json({ ok: false, error: "missing" }, { status: 409 });
  return pdfResponse(doc.pdf, `PREVIEW-${name}`);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await verifyAdminRequest(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const by = (await getAdminSession())?.u ?? "admin";
  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  // A signed copy that came back by email, uploaded by the recruiter.
  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
    return markSigned(req, candidate, by);
  }

  let body: { action?: string; reason?: unknown; custom?: unknown; date?: unknown; availability?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (body.action === "update") {
    const result = await sendAgreementEmail(id, baseUrl(req), {
      kind: "updated",
      by,
      startDate: typeof body.date === "string" ? body.date : "",
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: AGREEMENT_REFUSAL_STATUS[result.reason] ?? 502 });
    }
    return NextResponse.json({ ok: true, ...patchOf(result.candidate) });
  }

  if (body.action === "send" || body.action === "reminder" || body.action === "reask") {
    const reason =
      body.action === "reask"
        ? agreementReaskMessage(
            typeof body.reason === "string" ? body.reason : "",
            typeof body.custom === "string" ? body.custom : "",
          )
        : undefined;
    if (body.action === "reask" && !reason) return NextResponse.json({ ok: false, error: "no_reason" }, { status: 400 });
    const result = await sendAgreementEmail(id, baseUrl(req), {
      kind: body.action === "send" ? "sent" : body.action,
      by,
      reason,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.reason, missing: agreementMissing(candidate) },
        { status: AGREEMENT_REFUSAL_STATUS[result.reason] ?? 502 },
      );
    }
    return NextResponse.json({ ok: true, ...patchOf(result.candidate) });
  }

  if (body.action === "startDate") {
    const date = readStartDate(body.date);
    if (!date) return NextResponse.json({ ok: false, error: "bad_date" }, { status: 400 });
    const status = agreementStatus(candidate);
    if (status === "signed" || status === "approved") {
      return NextResponse.json({ ok: false, error: "already_signed" }, { status: 409 });
    }
    const updated = await setAgreementStartDate(id, date);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${id} start date set to ${date} by ${by}`);
    return NextResponse.json({ ok: true, ...patchOf(updated) });
  }

  if (body.action === "availability") {
    // Before it is sent: a sent agreement carries the hours it was sent with.
    if (agreementStatus(candidate) !== "not_sent") {
      return NextResponse.json({ ok: false, error: "already_sent" }, { status: 409 });
    }
    const checked = validateAvailability(body.availability);
    if (!checked.ok) return NextResponse.json({ ok: false, error: "bad_availability", problems: checked.problems }, { status: 400 });
    const updated = await setAvailabilityByRecruiter(id, checked.availability, by);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${id} work hours set by ${by}`);
    return NextResponse.json({ ok: true, ...patchOf(updated) });
  }

  if (body.action === "approve" || body.action === "unapprove") {
    if (body.action === "approve" && agreementStatus(candidate) !== "signed") {
      return NextResponse.json({ ok: false, error: "nothing_to_approve" }, { status: 409 });
    }
    const updated = await setAgreementApproved(id, body.action === "approve" ? by : null);
    if (!updated) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    // eslint-disable-next-line no-console
    console.log(`[agreement] ${id} signed agreement ${body.action === "approve" ? "accepted" : "acceptance undone"} by ${by}`);
    return NextResponse.json({ ok: true, ...patchOf(updated) });
  }

  return NextResponse.json({ ok: false, error: "bad_action" }, { status: 400 });
}

async function markSigned(req: NextRequest, candidate: Candidate, by: string) {
  const id = candidate.id;
  if (!candidate.agreementSentAt) return NextResponse.json({ ok: false, error: "not_sent" }, { status: 409 });
  if (!r2Configured()) return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ ok: false, error: "no_files" }, { status: 400 });
  if (files.length > MAX_SIGNED_FILES) return NextResponse.json({ ok: false, error: "too_many" }, { status: 400 });

  const keys: string[] = [];
  for (const f of files) {
    const name = safeFilename(f.name);
    if (!isAllowedForKind("signedAgreement", name)) {
      return NextResponse.json({ ok: false, error: "bad_type", file: name }, { status: 400 });
    }
    if (f.size > MAX_SIGNED_AGREEMENT_BYTES) {
      return NextResponse.json({ ok: false, error: "too_large", file: name }, { status: 400 });
    }
    const bytes = new Uint8Array(await f.arrayBuffer());
    const verdict = scanDocument(bytes, name);
    if (!verdict.ok) return NextResponse.json({ ok: false, error: "blocked", file: name, reason: verdict.reason }, { status: 400 });
    const ext = extensionOf(name);
    const key = `candidates/${id}/signedAgreement-${newId(8)}${ext}`;
    const type = ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
    if (!(await putObject(key, Buffer.from(bytes), type))) {
      return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
    }
    await addDocument(id, {
      kind: "signedAgreement",
      filename: name,
      size: bytes.length,
      uploadedAt: new Date().toISOString(),
      status: "clean",
      key,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    keys.push(key);
  }

  const result = await completeAgreement(id, { via: "admin", by, keys });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
  // eslint-disable-next-line no-console
  console.log(`[agreement] ${id} signed copy uploaded by ${by} (${keys.length} file${keys.length === 1 ? "" : "s"})`);
  return NextResponse.json({ ok: true, ...patchOf(result.candidate) });
}
