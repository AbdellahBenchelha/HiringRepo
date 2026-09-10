import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/adminAuth";
import { getCandidate, recordCompanyRequest } from "@/lib/store";
import { sendEmail } from "@/lib/email";
import {
  companyDetailsHtml,
  companyDetailsSubject,
  companyDetailsText,
} from "@/lib/emailTemplates";
import { acceptedAsCompany } from "@/lib/companyDetails";
import { createCompanyToken } from "@/lib/token";
import { siteConfig } from "@/config/site";

/**
 * Ask a candidate to confirm the company they are contracting through.
 *
 * Sent by hand, one at a time. Refused for anybody who accepted in their own
 * name: their agreement is with them, there is no company to confirm, and an
 * email asking for a W-9 would be a demand for tax paperwork nobody owes.
 */

export const runtime = "nodejs";

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

  const { id } = await ctx.params;
  const candidate = await getCandidate(id);
  if (!candidate) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  if (!acceptedAsCompany(candidate)) {
    return NextResponse.json({ ok: false, error: "not_a_company" }, { status: 409 });
  }

  const email = (candidate.email || "").trim();
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  // Recorded before the email goes: the page reads the request timestamp back
  // out of the record to check the link is the current one, and a candidate
  // who opens it immediately must not beat the write.
  const saved = await recordCompanyRequest(id);
  if (!saved) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const token = createCompanyToken({
    id,
    sentAt: saved.companyRequestedAt ?? new Date().toISOString(),
  });

  const result = await sendEmail({
    to: email,
    toName: candidate.fullName || undefined,
    subject: companyDetailsSubject(),
    html: companyDetailsHtml({
      fullName: candidate.fullName || "Candidate",
      companyName: candidate.confirmedDetails?.companyName,
      url: `${baseUrl(req)}/company?t=${encodeURIComponent(token)}`,
    }),
    text: companyDetailsText({
      fullName: candidate.fullName || "Candidate",
      companyName: candidate.confirmedDetails?.companyName,
      url: `${baseUrl(req)}/company?t=${encodeURIComponent(token)}`,
    }),
    replyTo: siteConfig.contact.recruitmentEmail,
  });

  if (!result.ok) {
    const reason = "skipped" in result ? result.skipped : result.error;
    // eslint-disable-next-line no-console
    console.warn(`[company] request not sent to ${email}: ${reason}`);
    return NextResponse.json({ ok: false, error: reason }, { status: 502 });
  }

  // eslint-disable-next-line no-console
  console.log(`[company] details requested from ${email} (${saved.companyRequestCount ?? 1})`);
  return NextResponse.json({
    ok: true,
    companyRequestedAt: saved.companyRequestedAt,
    companyRequestCount: saved.companyRequestCount,
    companyRequests: saved.companyRequests,
  });
}
