"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { activeAppointments, type CompanyCheck } from "@/lib/companyCheck";

/**
 * Whether this candidate is on the UK register of company officers.
 *
 * Presented as evidence to read, never as a verdict. A name search returns
 * strangers who share a name, so every result says how it was matched, and the
 * company number links straight to the register so the recruiter can confirm
 * rather than take this panel's word for it.
 *
 * Nothing here changes the candidate's status, and nothing here rejects
 * anybody. It exists because knowing someone already invoices through a
 * limited company tells you how to engage them.
 */

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "short", year: "numeric", timeZone: "UTC",
  });
}

const FAILURE: Record<string, string> = {
  not_configured: "No Companies House API key is set on the server, so this cannot run.",
  unauthorised: "Companies House rejected the API key. Check it is a REST key with no domain or IP restriction.",
  rate_limited: "Companies House is rate-limiting us. Try again in a few minutes.",
  unavailable: "Companies House could not be reached.",
};

export function CompanyCheckPanel({
  id,
  initial,
  hasDob,
}: {
  id: string;
  initial?: CompanyCheck;
  /** Without one, a name search cannot be corroborated — say so up front. */
  hasDob: boolean;
}) {
  const [check, setCheck] = useState<CompanyCheck | undefined>(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  async function run() {
    if (busy) return;
    setBusy(true);
    setFailed("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/company-check`, {});
      const data = (await res.json()) as { ok?: boolean; error?: string; check?: CompanyCheck };
      if (data.ok && data.check) setCheck(data.check);
      else setFailed(data.error === "no_name" ? "This candidate has no name on file to search with." : "The check could not be run.");
    } catch {
      setFailed("The check could not be run.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-5 rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-navy-800">UK company directorships</p>
          {check && !check.error ? (
            check.matches.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand-300 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
                <Icon name="briefcase" className="h-3 w-3" />
                {check.matches.length} possible match{check.matches.length === 1 ? "" : "es"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-500">
                No match
              </span>
            )
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 px-3 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
        >
          <Icon name="search" className="h-3.5 w-3.5" />
          {busy ? "Checking…" : check ? "Check again" : "Check Companies House"}
        </button>
      </div>

      {failed ? <p className="mt-2 text-sm font-medium text-red-600">{failed}</p> : null}

      {!check ? (
        <p className="mt-2 text-sm text-navy-500">
          Searches the UK register of company officers for this candidate&apos;s name
          {hasDob ? ", narrowed by their date of birth" : ""}. Nothing has been checked yet.
          {hasDob ? null : (
            <>
              {" "}
              <strong className="text-amber-700">
                No date of birth is on file, so a result can only be matched on name.
              </strong>
            </>
          )}
        </p>
      ) : check.error ? (
        <p className="mt-2 text-sm font-medium text-amber-700">
          {FAILURE[check.error] ?? "The check did not complete."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-xs text-navy-400">
            Searched <strong className="text-navy-600">{check.searchedName}</strong>
            {check.usedDob ? ` with date of birth ${check.usedDob}` : " with no date of birth"} ·{" "}
            {fmt(check.checkedAt)}
          </p>

          {check.matches.length === 0 ? (
            <p className="mt-3 text-sm text-navy-600">
              {check.totalNameHits > 0 ? (
                <>
                  The register holds{" "}
                  <strong className="text-navy-900">{check.totalNameHits}</strong> officer
                  {check.totalNameHits === 1 ? "" : "s"} with this name, but none whose date of
                  birth matches this candidate. On the evidence here they are not one of them.
                </>
              ) : (
                <>
                  No officer of this name appears on the UK register. That rules out a UK company
                  only — it says nothing about companies registered anywhere else.
                </>
              )}
            </p>
          ) : (
            <>
              {check.matches.some((m) => m.confidence === "name-only") ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  <strong>Matched on name only.</strong> Without a date of birth to corroborate it,
                  any of these could be a different person who happens to share the name. Open the
                  register and confirm before acting on it.
                </p>
              ) : (
                <p className="mt-3 rounded-lg border border-navy-100 bg-navy-50/60 p-3 text-xs leading-relaxed text-navy-600">
                  Name and birth month/year both match. That is a strong signal but not proof —
                  the register publishes only the month and year, so a coincidence remains
                  possible. The company number links to the register.
                </p>
              )}

              <div className="mt-3 space-y-3">
                {check.matches.map((m) => {
                  const active = activeAppointments(m);
                  return (
                    <div key={m.officerId} className="rounded-lg border border-navy-100 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-bold text-navy-900">{m.officerName}</p>
                        <p className="text-xs text-navy-400">
                          {m.dob ? `Born ${m.dob.month}/${m.dob.year}` : "No date of birth published"}
                          {" · "}
                          {active.length} active of {m.appointments.length}
                        </p>
                      </div>

                      <ul className="mt-2 space-y-1.5">
                        {m.appointments.map((a) => (
                          <li
                            key={`${a.companyNumber}-${a.appointedOn ?? ""}`}
                            className="flex flex-wrap items-baseline gap-x-2 text-xs"
                          >
                            <a
                              href={`https://find-and-update.company-information.service.gov.uk/company/${a.companyNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-brand-700 underline"
                            >
                              {a.companyName}
                            </a>
                            <span className="text-navy-400">{a.companyNumber}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                a.companyStatus === "active"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-navy-100 text-navy-500"
                              }`}
                            >
                              {a.companyStatus}
                            </span>
                            <span className="text-navy-500">{a.role}</span>
                            {a.resignedOn ? (
                              <span className="text-navy-400">resigned {fmtDate(a.resignedOn)}</span>
                            ) : a.appointedOn ? (
                              <span className="text-navy-400">since {fmtDate(a.appointedOn)}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
