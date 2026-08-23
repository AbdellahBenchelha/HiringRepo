import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";

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

  const headers = [
    "id", "First name", "Last name", "Date of birth", "Email", "Phone",
    "Country", "City", "Address", "LinkedIn", "Position", "Languages",
    "Status", "Applied", "Submitted", "Interview completed", "Score", "Total",
    "Assessment email sent", "Possible duplicate", "Duplicate of", "Notes",
  ];

  const rows = candidates.map((c) =>
    [
      c.id, c.firstName, c.lastName, c.dob, c.email, c.phone,
      c.country, c.city, c.address, c.linkedin, c.position,
      (c.languages || []).map((l) => l.language).filter(Boolean).join(" / "),
      c.status, c.createdAt, c.submittedAt ?? "",
      c.interview ? "Yes" : "No",
      c.interview?.score ?? "", c.interview?.total ?? "",
      c.interviewEmailSentAt ?? "",
      c.duplicateFlag ? "Yes" : "No", c.duplicateOfName ?? "",
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
