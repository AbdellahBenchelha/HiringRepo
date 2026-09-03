import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { DOCUMENT_SHORT } from "@/lib/documents";
import { requiredCountries } from "@/lib/verificationStore";
import { verificationStatus, VERIFICATION_LABEL } from "@/lib/verification";
import { countryMatch } from "@/lib/countryCheck";
import { summariseCheck } from "@/lib/companyCheck";

/**
 * CSV export of every candidate.
 *
 * This is the backup route. Candidate data lives in a single JSON file on a
 * host volume with no automatic backups, and that file holds names, dates of
 * birth, phone numbers and — for US applicants — SSNs. Losing the volume loses
 * everything, so there has to be a way to get the data out.
 *
 * A GET so the browser can download it directly, which means no CSRF header is
 * possible; a valid admin session is required instead. It is read-only, so
 * that is the right trade — a CSRF-forged GET could only make the admin's own
 * browser download a file it already has access to.
 */

export const runtime = "nodejs";

/**
 * Quote a CSV field.
 *
 * The leading apostrophe on anything starting with = + - or @ is deliberate:
 * without it, spreadsheet software treats the value as a formula, so a field
 * beginning "=" can execute when the file is opened. Applicant-supplied text
 * reaches this file, so it is untrusted input.
 */
function csv(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: NextRequest) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const candidates = await listCandidates();
  const required = await requiredCountries();

  const headers = [
    "id", "First name", "Last name", "Date of birth", "Email", "Phone",
    "Country", "Sent from", "Country mismatch", "City", "Address", "LinkedIn", "Position", "Languages",
    "Status", "Applied", "Submitted", "Interview completed", "Score", "Total",
    "Assessment email sent", "Possible duplicate", "Duplicate of", "Documents", "ID verification", "Verified on",
    // Everything the candidate re-stated on accepting. This is the record an
    // agreement is written from, so a backup without it is not a backup.
    "Offer accepted", "Details confirmed", "Engaged as", "Company name", "Company number",
    "VAT number", "Confirmed first name", "Confirmed last name", "Confirmed date of birth",
    "Nationality", "ID / passport number", "Confirmed phone", "Confirmed country",
    "Confirmed city", "Confirmed address", "Postcode",
    "UK companies checked", "UK companies result",
    "Notes",
  ];

  const rows = candidates.map((c) =>
    [
      c.id, c.firstName, c.lastName, c.dob, c.email, c.phone,
      c.country,
      c.detectedCountryName ?? "",
      // Spelled out rather than left to be eyeballed: the two columns are
      // adjacent in the file but nobody scans a thousand rows for a difference.
      { match: "No", mismatch: "Yes", unknown: "" }[countryMatch(c)],
      c.city, c.address, c.linkedin, c.position,
      (c.languages || []).map((l) => l.language).filter(Boolean).join(" / "),
      c.status, c.createdAt, c.submittedAt ?? "",
      c.interview ? "Yes" : "No",
      c.interview?.score ?? "", c.interview?.total ?? "",
      c.interviewEmailSentAt ?? "",
      c.duplicateFlag ? "Yes" : "No", c.duplicateOfName ?? "",
      // Which documents exist, not links: a signed URL expires in minutes and
      // would be dead long before anyone opened the spreadsheet.
      (c.documents ?? [])
        .map((d) => `${DOCUMENT_SHORT[d.kind]}${d.status === "clean" ? "" : ` (${d.status})`}`)
        .join(" / "),
      VERIFICATION_LABEL[verificationStatus(c, required)],
      c.verifiedAt ?? c.rejectedAt ?? "",
      c.offerAcceptedAt ?? "",
      c.confirmedDetailsAt ?? "",
      c.confirmedDetails?.engagedAs ?? "",
      c.confirmedDetails?.companyName ?? "",
      c.confirmedDetails?.companyNumber ?? "",
      c.confirmedDetails?.companyVat ?? "",
      c.confirmedDetails?.firstName ?? "",
      c.confirmedDetails?.lastName ?? "",
      c.confirmedDetails?.dob ?? "",
      c.confirmedDetails?.nationality ?? "",
      c.confirmedDetails?.idNumber ?? "",
      c.confirmedDetails?.phone ?? "",
      c.confirmedDetails?.country ?? "",
      c.confirmedDetails?.city ?? "",
      c.confirmedDetails?.address ?? "",
      c.confirmedDetails?.postcode ?? "",
      c.companyCheck?.checkedAt ?? "",
      summariseCheck(c.companyCheck),
      c.notes ?? "",
    ].map(csv).join(","),
  );

  // The BOM makes Excel read it as UTF-8; without it accented names arrive
  // mangled, which matters for a multilingual applicant list.
  const body = "﻿" + [headers.map(csv).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="workroute-candidates-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
