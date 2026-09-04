"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InterviewActions } from "@/components/admin/InterviewActions";
import { VerificationBadge, verificationStateOf } from "@/components/admin/VerificationPanel";
import { VerificationQuickView } from "@/components/admin/VerificationQuickView";
import { CandidateInfoButton } from "@/components/admin/CandidateInfoButton";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import { useProfileNav } from "@/components/admin/useProfileNav";
import { useBulkCompanyCheck } from "@/components/admin/BulkCompanyCheck";
import { adminPost } from "@/lib/adminClient";
import type { CandidateDocument } from "@/lib/documents";
import { PhoneCountryFlag } from "@/components/admin/PhoneCountryFlag";
import { DetectedCountryFlag } from "@/components/admin/DetectedCountryFlag";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import { CANDIDATE_STATUSES, VOICE_STATUSES, type CandidateStatus, type VoiceStatus } from "@/lib/candidateStatus";
import { VERIFICATION_FILTERS, type VerificationFilter } from "@/lib/verification";
import { offerStatus, OFFER_LABEL, type OfferStatus } from "@/lib/offer";
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

export function InterviewsTable({ rows }: { rows: InterviewRow[] }) {
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
   * Each row has up to three independent client islands describing the same
   * person — the voice assessment controls, the profile dialog, and now the
   * verification quick view. Held separately they drift: marking someone as
   * having passed in one leaves the others still showing what the server
   * sent, which is why the offer form would not appear until a reload. One
   * patch per row, every island reading and writing it, and the filters see
   * the edits too.
   */
  const [patches, setPatches] = useState<Record<string, Partial<CandidateView>>>({});
  const patch = (id: string, p: Partial<CandidateView>) =>
    setPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));

  /** The candidate whose photos are open in the quick view, if any. */
  const [quickView, setQuickView] = useState<CandidateView | null>(null);

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

  // The dialog steps through the filtered list, so it needs both as plain
  // candidates rather than as rows.
  const everyone = useMemo(() => live.map((r) => r.view), [live]);
  const ordered = useMemo(() => shown.map((r) => r.view), [shown]);
  const { profile, open: openProfile, close: closeProfile, nav } = useProfileNav(
    everyone,
    ordered,
    pageSize,
    setPage,
  );

  /** Which document is open in the reader, from whichever profile is showing. */
  const [viewing, setViewing] = useState<CandidateDocument | null>(null);

  async function changeStatus(id: string, next: CandidateStatus) {
    patch(id, { status: next });
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status: next });
    } catch {
      /* optimistic; the table reloads with the truth */
    }
  }

  // Scoped to the current page, not to everyone the filters left.
  const companyCheck = useBulkCompanyCheck(
    useMemo(() => visible.map((r) => r.view), [visible]),
    (id, check) => patch(id, { companyCheck: check }),
  );

  // A document reader belongs to the candidate it was opened from, so stepping
  // to the next one closes it rather than leaving someone else's CV on screen.
  useEffect(() => {
    setViewing(null);
  }, [profile?.id]);

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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-500">
          <span className="font-semibold text-navy-900">{visible.length}</span> on this page
        </p>
        {companyCheck.control}
      </div>

      {companyCheck.panel}

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
              <th className="px-4 py-3 font-semibold">Voice assessment</th>
              {/* Pinned right, as on the Candidates table: the voice-assessment
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
              visible.map(({ view: c }) => {
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
                        onOpenPhotos={() => setQuickView(c)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <InterviewActions
                        id={c.id}
                        fullName={c.fullName}
                        email={c.email}
                        voiceRequestedAt={c.voiceRequestedAt}
                        voiceStatus={c.voiceStatus}
                        onVoiceStatusChange={(voiceStatus) => patch(c.id, { voiceStatus })}
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
                        <CandidateInfoButton onOpen={() => openProfile(c)} />
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

      {quickView ? (
        <VerificationQuickView
          id={quickView.id}
          fullName={quickView.fullName}
          documents={quickView.documents}
          initial={verificationStateOf(quickView)}
          onClose={() => setQuickView(null)}
          onChange={(v) => {
            const p = {
              verificationStatus: v.status,
              verifiedAt: v.verifiedAt,
              verifiedBy: v.verifiedBy,
              rejectedAt: v.rejectedAt,
              rejectionReason: v.rejectionReason,
              imagesDeletedAt: v.imagesDeletedAt,
              verificationRequestedAt: v.requestedAt,
            };
            patch(quickView.id, p);
            // The dialog reads its own snapshot, not the row's patch map, so
            // it has to be told directly or verifying would show the old
            // badge until the dialog is closed and reopened.
            setQuickView((q) => (q ? { ...q, ...p } : q));
          }}
        />
      ) : null}

      {/* Owned by the table, not by each row, so Previous and Next have a list
          to walk. Offers are made from this tab and only this tab. */}
      {profile ? (
        <CandidateProfileModal
          key={profile.id}
          candidate={profile}
          showOffer
          nav={nav}
          onClose={closeProfile}
          onOpenDocument={setViewing}
          onStatusChange={changeStatus}
          onChange={(p) => patch(profile.id, p)}
        />
      ) : null}

      {viewing && profile ? (
        <DocumentViewer
          candidateId={profile.id}
          candidateName={profile.fullName}
          document={viewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </>
  );
}

export { OFFER_LABEL };
