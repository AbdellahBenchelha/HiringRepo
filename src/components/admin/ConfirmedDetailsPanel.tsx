"use client";

import { Icon } from "@/components/Icon";
import { CONFIRMED_LABELS, detailChanges, type ConfirmedDetails } from "@/lib/hiring";
import type { CandidateView } from "@/lib/candidateView";

/**
 * What the candidate stated when accepting, and what they corrected.
 *
 * The corrections are the reason this step exists. An application is filled in
 * to get past a form; this was filled in to be paid. Showing "was 'asdf', now
 * '12 Allen Avenue'" is what tells a recruiter the first answer was junk —
 * without it you are looking at a tidy record with no way to know whether the
 * step changed anything at all.
 */

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Shown in the order a person reads them, company block only when relevant. */
function rowsFor(d: ConfirmedDetails): [string, string][] {
  const rows: [string, string][] = [[CONFIRMED_LABELS.engagedAs, d.engagedAs]];
  if (d.engagedAs === "Company") {
    rows.push([CONFIRMED_LABELS.companyName, d.companyName ?? "—"]);
    rows.push([CONFIRMED_LABELS.companyNumber, d.companyNumber ?? "—"]);
    if (d.companyVat) rows.push([CONFIRMED_LABELS.companyVat, d.companyVat]);
  }
  rows.push(
    [CONFIRMED_LABELS.firstName, d.firstName],
    [CONFIRMED_LABELS.lastName, d.lastName],
    [CONFIRMED_LABELS.dob, d.dob],
    [CONFIRMED_LABELS.nationality, d.nationality],
    [CONFIRMED_LABELS.idNumber, d.idNumber],
    [CONFIRMED_LABELS.phone, d.phone],
    [CONFIRMED_LABELS.country, d.country],
    [CONFIRMED_LABELS.city, d.city],
    [CONFIRMED_LABELS.address, d.address],
    [CONFIRMED_LABELS.postcode, d.postcode],
  );
  return rows;
}

export function ConfirmedDetailsPanel({ candidate }: { candidate: CandidateView }) {
  const d = candidate.confirmedDetails;

  if (!d) {
    // Only worth saying for someone who actually accepted — for everyone else
    // there is nothing to confirm yet and the absence means nothing.
    if (!candidate.offerAcceptedAt) return null;
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Details not confirmed</p>
        <p className="mt-1 text-sm text-amber-800">
          This offer was accepted without the candidate re-confirming their details, so the record
          below is still whatever they typed on the application form. Re-send the offer if you need
          confirmed details for the agreement.
        </p>
      </div>
    );
  }

  const changes = detailChanges(candidate, d);

  return (
    <div className="mt-5 rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-navy-800">Confirmed details</p>
        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
          <Icon name="checkCircle" className="h-3 w-3" />
          Confirmed {fmt(candidate.confirmedDetailsAt)}
        </span>
      </div>

      <dl className="mt-3 divide-y divide-navy-50">
        {rowsFor(d).map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
            <dt className="text-xs uppercase tracking-wide text-navy-400">{label}</dt>
            <dd className="break-words text-sm font-medium text-navy-900">{value || "—"}</dd>
          </div>
        ))}
      </dl>

      {changes.length > 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
            Corrected from the application
          </p>
          <ul className="mt-2 space-y-1.5">
            {changes.map((c) => (
              <li key={c.label} className="text-xs text-amber-900">
                <span className="font-semibold">{c.label}:</span>{" "}
                <span className="line-through opacity-70">{c.was}</span>{" "}
                <span aria-hidden>→</span> <span className="font-semibold">{c.now}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-navy-400">
          Nothing changed from the application — everything they first gave us was already correct.
        </p>
      )}
    </div>
  );
}
