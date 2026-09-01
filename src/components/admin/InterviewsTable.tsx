"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InterviewActions } from "@/components/admin/InterviewActions";
import { VerificationBadge } from "@/components/admin/VerificationPanel";
import { CandidateInfoButton } from "@/components/admin/CandidateInfoButton";
import { PhoneCountryFlag } from "@/components/admin/PhoneCountryFlag";
import { DetectedCountryFlag } from "@/components/admin/DetectedCountryFlag";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import { CANDIDATE_STATUSES, VOICE_STATUSES, type CandidateStatus, type VoiceStatus } from "@/lib/candidateStatus";
import { VERIFICATION_FILTERS, type VerificationFilter } from "@/lib/verification";
import { offerStatus, OFFER_LABEL, type OfferStatus } from "@/lib/offer";
import type { TemplateKey, TemplateVars } from "@/lib/messageTemplates";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Completed interviews, filtered and paged.
 *
 * The filtering is client-side over rows the server already sent, like the
 * Candidates table: a filter that reloads the page is a filter nobody uses
 * twice, and the store reads the whole file per request either way, so paging
 * on the server would save the transfer and nothing else.
 *
 * Order matters — filter, then sort, then page. Paging first would make every
 * filter a search of the current page, so "nobody has passed" would really
 * mean "nobody in this twenty-five".
 *
 * The server has already dropped candidates whose ID check has not been
 * requested — that is a separate rule with its own link in the header, and
 * these filters narrow whatever survived it.
 */

export interface InterviewRow {
  view: CandidateView;
  /** Placeholder values for the WhatsApp templates, built server-side. */
  vars: TemplateVars;
}

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

const OFFER_FILTERS: { value: "all" | OfferStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "No offer" },
  { value: "sent", label: "Offer sent" },
  { value: "accepted", label: "Offer accepted" },
  { value: "declined", label: "Offer declined" },
];

export function InterviewsTable({
  rows,
  templates,
}: {
  rows: InterviewRow[];
  templates: Record<TemplateKey, string>;
}) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [voice, setVoice] = useState<"all" | VoiceStatus>("all");
  const [verification, setVerification] = useState<VerificationFilter>("all");
  const [status, setStatus] = useState<"all" | CandidateStatus>("all");
  const [offer, setOffer] = useState<"all" | OfferStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const tableTop = useRef<HTMLDivElement>(null);

  /**
   * Edits made since the page was rendered, by candidate id.
   *
   * Each row has two independent client islands — the voice assessment
   * controls and the profile dialog — and they describe the same person. Held
   * separately they drift: marking someone as having passed in one leaves the
   * other still showing what the server sent, which is why the offer form
   * would not appear until a reload. One patch per row, both islands reading
   * and writing it, and the filters see the edits too.
   */
  const [patches, setPatches] = useState<Record<string, Partial<CandidateView>>>({});
  const patch = (id: string, p: Partial<CandidateView>) =>
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  const live = useMemo(
    () => rows.map((r) => (patches[r.view.id] ? { ...r, view: { ...r.view, ...patches[r.view.id] } } : r)),
    [rows, patches],
  );

  // Only offer countries that actually appear, so the filter never lists
  // options that return nothing.
  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.view.country).filter(Boolean))].sort(),
    [rows],
  );

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter(({ view: c }) => {
      if (q && ![c.fullName, c.email, c.phone, c.country, c.city].some((v) => (v || "").toLowerCase().includes(q))) {
        return false;
      }
      if (country !== "all" && c.country !== country) return false;
      if (voice !== "all" && (c.voiceStatus ?? "Voice Assessment Not Requested") !== voice) return false;
      if (verification !== "all" && c.verificationStatus !== verification) return false;
      if (status !== "all" && c.status !== status) return false;
      if (offer !== "all" && offerStatus(c) !== offer) return false;
      return true;
    });
  }, [live, search, country, voice, verification, status, offer]);

  const filtering = shown.length !== rows.length;

  // Paged after filtering, never before, so a filter always searches everyone
  // rather than whichever twenty-five happen to be on screen.
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  // Derived, not corrected afterwards: narrowing to three rows while on page 5
  // must show those three straight away, not a blank table for a frame.
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => shown.slice((current - 1) * pageSize, current * pageSize),
    [shown, current, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, country, voice, verification, status, offer, pageSize]);

  function goToPage(next: number) {
    setPage(next);
    tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div ref={tableTop} className="card mb-5 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="label">Search</span>
            <input
              id="search"
              className="input"
              placeholder="Name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="label">Voice assessment</span>
            <select id="voice" className="select" value={voice} onChange={(e) => setVoice(e.target.value as typeof voice)}>
              <option value="all">All</option>
              {VOICE_STATUSES.map((v) => (
                <option key={v} value={v}>{v.replace("Voice Assessment ", "").replace("Voice ", "")}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Offer</span>
            <select id="offer" className="select" value={offer} onChange={(e) => setOffer(e.target.value as typeof offer)}>
              {OFFER_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">ID check</span>
            <select
              id="verification"
              className="select"
              value={verification}
              onChange={(e) => setVerification(e.target.value as VerificationFilter)}
            >
              {VERIFICATION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Candidate status</span>
            <select id="status" className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All</option>
              {CANDIDATE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
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

        {filtering ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-3">
            {/* How many the filters left. The pagination line below the table
                says which of them you are looking at. */}
            <p className="text-sm text-navy-500">
              <strong className="text-navy-800">{shown.length}</strong> of {rows.length} match
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCountry("all");
                setVoice("all");
                setVerification("all");
                setStatus("all");
                setOffer("all");
              }}
              className="rounded-full px-3 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1400px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Completed</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">%</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">ID check</th>
              <th className="px-4 py-3 font-semibold">Follow-up (WhatsApp)</th>
              {/* Pinned right, as on the Candidates table: the follow-up
                  column is wide, and the actions must stay reachable without
                  scrolling sideways to find them. */}
              <th className="sticky right-0 whitespace-nowrap bg-navy-50 px-4 py-3 font-semibold shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                Results
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-navy-400">
                  {rows.length === 0
                    ? "No completed interviews yet."
                    : "No interviews match your filters."}
                </td>
              </tr>
            ) : (
              visible.map(({ view: c, vars }) => {
                const p = pct(c.score ?? 0, c.total ?? 0);
                return (
                  <tr key={c.id} className="align-top hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {c.fullName || "—"}
                      <span className="mt-0.5 block text-xs font-normal text-navy-500">
                        {c.phone || "no number"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{c.country || "—"}</p>
                      {c.city ? <p className="text-xs text-navy-500">{c.city}</p> : null}
                      <PhoneCountryFlag country={c.country} phone={c.phone} />
                      <DetectedCountryFlag
                        country={c.country}
                        detectedCountryName={c.detectedCountryName}
                      />
                    </td>
                    <td className="px-4 py-3 text-navy-500">{fmt(c.interviewCompletedAt)}</td>
                    <td className="px-4 py-3 font-semibold text-navy-800">
                      {c.score}/{c.total}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold ${p >= 60 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600"}`}
                      >
                        {p}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadge
                        status={c.verificationStatus}
                        requestedAt={c.verificationRequestedAt}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InterviewActions
                        id={c.id}
                        fullName={c.fullName}
                        phone={c.phone}
                        successMessageSentAt={c.successMessageSentAt}
                        voiceRequestedAt={c.voiceRequestedAt}
                        voiceStatus={c.voiceStatus}
                        onVoiceStatusChange={(voiceStatus) => patch(c.id, { voiceStatus })}
                        templates={templates}
                        vars={vars}
                      />
                    </td>
                    <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                      <div className="flex flex-col items-start gap-2 whitespace-nowrap">
                        <Link
                          href={`/admin/interviews/${c.id}`}
                          className="text-sm font-medium text-brand-700 hover:text-brand-800"
                        >
                          View answers →
                        </Link>
                        {/* Offers are made from this tab and only this tab. */}
                        <CandidateInfoButton
                          candidate={c}
                          showOffer
                          onChange={(p) => patch(c.id, p)}
                        />
                      </div>
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
        noun="interview"
        onPage={goToPage}
        onPageSize={setPageSize}
      />
    </>
  );
}

export { OFFER_LABEL };
