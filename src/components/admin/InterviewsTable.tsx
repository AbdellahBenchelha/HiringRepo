"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InterviewActions } from "@/components/admin/InterviewActions";
import {
  VerificationBadge,
  verificationPatch,
  verificationStateOf,
} from "@/components/admin/VerificationPanel";
import { VerificationQuickView } from "@/components/admin/VerificationQuickView";
import { CandidateInfoButton } from "@/components/admin/CandidateInfoButton";
import { DeleteCandidateButton } from "@/components/admin/DeleteCandidateButton";
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

/**
 * Where the hidden countries are remembered.
 *
 * Unlike the other filters, this one is a standing decision rather than a
 * question about the list in front of you: somebody who does not recruit from
 * a country does not want to hide it again after every reload. Kept in the
 * browser rather than on the record — it is one recruiter's view of the table,
 * not a fact about the candidates, and nobody is rejected by it.
 */
const HIDDEN_COUNTRIES_KEY = "wr.interviews.hiddenCountries";

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
  /** Countries taken out of the table entirely. Restored from the browser below. */
  const [hiddenCountries, setHiddenCountries] = useState<string[]>([]);
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

  /**
   * Rows deleted since this page was rendered.
   *
   * Kept beside the patches rather than by holding a copy of `rows`: the list
   * arrives as a prop from the server, and a second copy of it would go stale
   * against every other reason it changes. A deleted record is gone — a list
   * still showing it is lying.
   */
  const [deleted, setDeleted] = useState<string[]>([]);

  const live = useMemo(
    () =>
      rows
        .filter((r) => !deleted.includes(r.view.id))
        .map((r) => (patches[r.view.id] ? { ...r, view: { ...r.view, ...patches[r.view.id] } } : r)),
    [rows, patches, deleted],
  );

  // Only offer countries that actually appear, so the filter never lists
  // options that return nothing.
  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.view.country).filter(Boolean))].sort(),
    [rows],
  );

  /**
   * Restored once, on mount rather than in the initial state, because the
   * server rendered this table without a browser to read — reading storage
   * during the first render would make the markup disagree with itself.
   */
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(HIDDEN_COUNTRIES_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setHiddenCountries(saved.filter((v): v is string => typeof v === "string"));
      }
    } catch {
      /* A damaged value is no reason to show a broken table. */
    }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(HIDDEN_COUNTRIES_KEY, JSON.stringify(hiddenCountries));
    } catch {
      /* Private browsing, a full quota — the filter still works for this visit. */
    }
  }, [hiddenCountries]);

  function hideCountry(name: string) {
    if (!name) return;
    setHiddenCountries((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
    // Showing only India while hiding India is a contradiction with an empty
    // table as its answer, so the narrower filter gives way.
    setCountry((prev) => (prev === name ? "all" : prev));
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return live.filter(({ view: c }) => {
      // First, because it is a decision about who belongs in this table at
      // all — the other filters narrow whoever is left.
      if (c.country && hiddenCountries.includes(c.country)) return false;
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
  }, [live, search, country, hiddenCountries, voice, verification, status, offer]);

  /** How many rows the hidden countries are keeping off the table. */
  const hiddenCount = useMemo(
    () => live.filter((r) => r.view.country && hiddenCountries.includes(r.view.country)).length,
    [live, hiddenCountries],
  );

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

  /** The row is gone from the server; drop it here and close it if it is open. */
  function dropRow(id: string) {
    setDeleted((prev) => [...prev, id]);
    if (profile?.id === id) closeProfile();
  }

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
  }, [search, country, hiddenCountries, voice, verification, status, offer, pageSize]);

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
              {countries
                .filter((c) => !hiddenCountries.includes(c))
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </label>

          {/* Choosing here takes a country out of the table rather than
              narrowing to it. It stays a picker rather than becoming a list of
              tick boxes because most of the time nothing is hidden, and an
              empty list of ticks would take the same room as all the rest. */}
          <label className="block">
            <span className="label">Hide countries</span>
            <select
              id="hide-country"
              className="select"
              value=""
              onChange={(e) => hideCountry(e.target.value)}
            >
              <option value="">
                {hiddenCountries.length
                  ? `Hiding ${hiddenCountries.length} — hide another…`
                  : "Choose a country to hide…"}
              </option>
              {countries
                .filter((c) => !hiddenCountries.includes(c))
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </label>
        </div>

        {/* Always on screen while anything is hidden. A filter that quietly
            removes people is the one that has to say so, or the tab looks
            empty for no reason a week later. */}
        {hiddenCountries.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
            <span className="text-xs font-bold uppercase tracking-wide text-navy-500">
              Hidden
            </span>
            {hiddenCountries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setHiddenCountries((prev) => prev.filter((x) => x !== c))}
                title={`Show ${c} again`}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                {c}
                <span aria-hidden className="text-navy-400">&times;</span>
                <span className="sr-only">Show again</span>
              </button>
            ))}
            <span className="text-xs text-navy-500">
              {hiddenCount} interview{hiddenCount === 1 ? "" : "s"} kept off this table
            </span>
            <button
              type="button"
              onClick={() => setHiddenCountries([])}
              className="rounded-full px-3 py-1 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
            >
              Show all countries
            </button>
          </div>
        ) : null}

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
                // No answers on file: the interview happened somewhere else and
                // somebody set the status by hand. Showing 0% in red for that
                // would be a score this person never got.
                const scored = c.total != null && c.total > 0;
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
                    <td className="px-4 py-3 text-navy-500">
                      {scored ? (
                        fmt(c.interviewCompletedAt)
                      ) : (
                        <span className="text-navy-400">Marked by hand</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-navy-800">
                      {scored ? `${c.score}/${c.total}` : <span className="text-navy-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {scored ? (
                        <span
                          className={`font-semibold ${p >= 60 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {p}%
                        </span>
                      ) : (
                        <span className="text-navy-400">—</span>
                      )}
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
                    {/* Bounded, because the Results column is sticky and floats
                        over whatever runs under it. Without a width the voice
                        controls slide beneath it and their labels are cut in
                        half — they need to wrap before they reach it. */}
                    <td className="px-4 py-3 align-top">
                      <InterviewActions
                        id={c.id}
                        fullName={c.fullName}
                        email={c.email}
                        voiceRequestedAt={c.voiceRequestedAt}
                        voiceStatus={c.voiceStatus}
                        voiceOpenedAt={c.voiceOpenedAt}
                        voiceOpenCount={c.voiceOpenCount}
                        voiceReminderSentAt={c.voiceReminderSentAt}
                        voiceReminderCount={c.voiceReminderCount}
                        voiceNeeded={c.voiceNeeded}
                        onVoiceReminder={(p) => patch(c.id, p)}
                        onVoiceStatusChange={(voiceStatus) => patch(c.id, { voiceStatus })}
                      />
                    </td>
                    <td className="sticky right-0 bg-white px-4 py-3 shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                      <div className="flex flex-col items-start gap-2 whitespace-nowrap">
                        {/* There is no answer sheet for an interview this
                            system did not run, and a link to an empty one is a
                            dead end dressed as a page. */}
                        {scored ? (
                          <Link
                            href={`/admin/interviews/${c.id}`}
                            className="text-sm font-medium text-brand-700 hover:text-brand-800"
                          >
                            View answers →
                          </Link>
                        ) : (
                          <span className="text-sm text-navy-400">No answers on file</span>
                        )}
                        <div className="flex items-center gap-2">
                          <CandidateInfoButton onOpen={() => openProfile(c)} />
                          <DeleteCandidateButton candidate={c} onDeleted={dropRow} />
                        </div>
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
              ...verificationPatch(v),
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
