"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { CandidateInfoButton } from "@/components/admin/CandidateInfoButton";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import { formatRate } from "@/lib/offer";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Everyone who said yes.
 *
 * Both routes to an acceptance land here — the candidate confirming through
 * the link in their offer email, and the recruiter marking it by hand after a
 * call — because "who accepted" is one question, not two.
 *
 * The column that earns its place is "Details confirmed": an offer accepted
 * on a call still has whatever the candidate typed into the application form
 * behind it, and that is exactly the data you cannot write an agreement from.
 */

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export function AcceptedTable({ rows }: { rows: CandidateView[] }) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [confirmed, setConfirmed] = useState<"all" | "yes" | "no">("all");
  const [engagedAs, setEngagedAs] = useState<"all" | "Individual" | "Company">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const tableTop = useRef<HTMLDivElement>(null);

  // Edits made in the profile dialog, so a note or a status change is
  // reflected without a reload — same pattern as the Interviews tab.
  const [patches, setPatches] = useState<Record<string, Partial<CandidateView>>>({});
  const live = useMemo(
    () => rows.map((r) => (patches[r.id] ? { ...r, ...patches[r.id] } : r)),
    [rows, patches],
  );

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country).filter(Boolean))].sort(),
    [rows],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter((c) => {
      if (q && ![c.fullName, c.email, c.phone, c.country, c.city, c.position].some((v) =>
        (v || "").toLowerCase().includes(q),
      )) return false;
      if (country !== "all" && c.country !== country) return false;
      if (confirmed === "yes" && !c.confirmedDetails) return false;
      if (confirmed === "no" && c.confirmedDetails) return false;
      if (engagedAs !== "all" && c.confirmedDetails?.engagedAs !== engagedAs) return false;
      return true;
    });
  }, [live, search, country, confirmed, engagedAs]);

  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => shown.slice((current - 1) * pageSize, current * pageSize),
    [shown, current, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, country, confirmed, engagedAs, pageSize]);

  function goToPage(next: number) {
    setPage(next);
    tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const waiting = live.filter((c) => !c.confirmedDetails).length;

  return (
    <>
      <div ref={tableTop} className="card mb-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Search</span>
            <input
              id="search"
              className="input"
              placeholder="Name, email or position"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="label">Details confirmed</span>
            <select
              id="confirmed"
              className="select"
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value as typeof confirmed)}
            >
              <option value="all">All</option>
              <option value="yes">Confirmed</option>
              <option value="no">Still waiting</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Engaged as</span>
            <select
              id="engaged"
              className="select"
              value={engagedAs}
              onChange={(e) => setEngagedAs(e.target.value as typeof engagedAs)}
            >
              <option value="all">All</option>
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </label>

          <label className="block">
            <span className="label">Country</span>
            <select id="country" className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="all">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {shown.length !== rows.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            <p className="text-sm text-navy-500">
              <strong className="text-navy-800">{shown.length}</strong> of {rows.length} match
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCountry("all");
                setConfirmed("all");
                setEngagedAs("all");
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      {waiting > 0 ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Icon name="shield" className="h-4 w-4 shrink-0" />
          {waiting} {waiting === 1 ? "person has" : "people have"} accepted without confirming their
          details — their agreement would be drawn from what they typed on the application form.
        </p>
      ) : null}

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1150px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Agreed pay</th>
              <th className="px-4 py-3 font-semibold">Start date</th>
              <th className="px-4 py-3 font-semibold">Accepted</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="sticky right-0 whitespace-nowrap bg-navy-50 px-4 py-3 font-semibold shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-navy-400">
                  {rows.length === 0
                    ? "Nobody has accepted an offer yet."
                    : "No accepted candidates match your filters."}
                </td>
              </tr>
            ) : (
              visible.map((c) => {
                const d = c.confirmedDetails;
                return (
                  <tr key={c.id} className="align-top hover:bg-navy-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-900">
                        {d ? `${d.firstName} ${d.lastName}`.trim() : c.fullName || "—"}
                      </p>
                      <p className="text-xs text-navy-500">{c.email || "—"}</p>
                      {d?.engagedAs === "Company" ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-navy-100 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                          <Icon name="briefcase" className="h-3 w-3" />
                          {d.companyName}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{d?.country || c.country || "—"}</p>
                      {d?.city || c.city ? (
                        <p className="text-xs text-navy-500">{d?.city || c.city}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-navy-700">{c.offer?.position || c.position || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">
                      {c.offer ? formatRate(c.offer) : "—"}
                    </td>
                    <td className="px-4 py-3 text-navy-600">{fmtDate(c.offer?.startDate)}</td>
                    <td className="px-4 py-3 text-navy-500">{fmt(c.offerAcceptedAt)}</td>
                    <td className="px-4 py-3">
                      {d ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          <Icon name="checkCircle" className="h-3 w-3" />
                          Confirmed
                        </span>
                      ) : (
                        <span
                          title="They accepted, but have not re-confirmed their details through the offer link."
                          className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
                        >
                          Still waiting
                        </span>
                      )}
                    </td>
                    <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                      <CandidateInfoButton
                        candidate={c}
                        showOffer
                        onChange={(p) => setPatches((prev) => ({ ...prev, [c.id]: { ...prev[c.id], ...p } }))}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={current}
        pageCount={pageCount}
        total={shown.length}
        pageSize={pageSize}
        noun="accepted candidate"
        onPage={goToPage}
        onPageSize={setPageSize}
      />
    </>
  );
}
