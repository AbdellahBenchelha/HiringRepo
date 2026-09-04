"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { InterviewBadge, IncompleteFormBadge, InviteHeldBadge } from "@/components/admin/StatusBadge";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@/lib/candidateStatus";
import { siteConfig } from "@/config/site";
import { adminPost, adminDelete } from "@/lib/adminClient";
import { SendAssessmentButton } from "@/components/admin/SendAssessmentButton";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ReminderActions } from "@/components/admin/ReminderActions";
import { DocumentChips } from "@/components/admin/DocumentChips";
import { CandidateProfileModal } from "@/components/admin/CandidateProfileModal";
import { useProfileNav } from "@/components/admin/useProfileNav";
import { useBulkCompanyCheck } from "@/components/admin/BulkCompanyCheck";
import { DocumentViewer } from "@/components/admin/DocumentViewer";
import { VerificationBadge, verificationStateOf } from "@/components/admin/VerificationPanel";
import { VerificationQuickView } from "@/components/admin/VerificationQuickView";
import { VERIFICATION_FILTERS, type VerificationFilter, type VerificationStatus } from "@/lib/verification";
import type { CandidateDocument } from "@/lib/documents";
import type { CandidateView } from "@/lib/candidateView";
import { PhoneCountryFlag } from "@/components/admin/PhoneCountryFlag";
import { DetectedCountryFlag } from "@/components/admin/DetectedCountryFlag";
import { isCountryMismatch } from "@/lib/countryCheck";
import { Pagination, DEFAULT_PAGE_SIZE } from "@/components/admin/Pagination";
import {
  followUpState,
  withSource,
  FOLLOW_UP_FILTERS,
  type FollowUpFilter,
  type FollowUpState,
} from "@/lib/followUp";

type SortKey = "applied" | "name" | "country" | "score" | "followup";

// Re-exported so existing imports of the view type keep working.
export type { CandidateView };

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function buildWhatsAppMessage(name: string, link: string): string {
  return (
    `Hello ${name},\n\n` +
    `Thank you for applying to join ${siteConfig.company.name}. We have reviewed your application and would like to invite you to complete the next stage of our recruitment process.\n\n` +
    `Please use the following link to complete your online interview:\n${link}\n\n` +
    `Please answer all questions carefully and submit your interview when finished.\n\n` +
    `Best regards,\nRecruitment Team`
  );
}

export function CandidatesTable({
  candidates,
  initialVerify,
  initialHeld,
}: {
  candidates: CandidateView[];
  /**
   * Filters the dashboard can arrive with already applied. Only the starting
   * value — once here, the filters are the reader's, so changing one does not
   * fight the URL it was opened from.
   */
  initialVerify?: string;
  initialHeld?: boolean;
}) {
  const [rows, setRows] = useState(candidates);
  const [search, setSearch] = useState("");
  const [interviewFilter, setInterviewFilter] = useState<"all" | "completed" | "opened" | "notopened" | "noform">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CandidateStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  /** The candidate whose photos are open in the quick view, if any. */
  const [quickView, setQuickView] = useState<CandidateView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CandidateView | null>(null);
  const [countryFilter, setCountryFilter] = useState<"all" | string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("all");
  const [verifyFilter, setVerifyFilter] = useState<VerificationFilter>(
    VERIFICATION_FILTERS.some((f) => f.value === initialVerify)
      ? (initialVerify as VerificationFilter)
      : "all",
  );
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [formFilter, setFormFilter] = useState<"all" | "yes" | "no">("all");
  const [heldOnly, setHeldOnly] = useState(!!initialHeld);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const tableTop = useRef<HTMLDivElement>(null);
  // Which document is open in the reader, and whose it is.
  const [viewing, setViewing] = useState<{ c: CandidateView; doc: CandidateDocument } | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "applied",
    dir: "desc",
  });

  // Only offer countries that actually appear, so the filter never lists
  // options that return nothing.
  const countries = useMemo(
    () => [...new Set(rows.map((c) => c.country).filter(Boolean))].sort(),
    [rows],
  );

  // One clock for the whole table, so every row's "6d ago" is measured from
  // the same instant and the sort cannot flip mid-render.
  const followUps = useMemo(() => {
    const now = Date.now();
    return new Map(rows.map((c) => [c.id, followUpState(c, now)]));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    return rows.filter((c) => {
      if (
        q &&
        ![c.fullName, c.email, c.phone, c.country, c.city, c.position].some((v) =>
          (v || "").toLowerCase().includes(q),
        )
      )
        return false;
      if (countryFilter !== "all" && c.country !== countryFilter) return false;
      if (interviewFilter === "completed" && !c.interviewCompleted) return false;
      // "Opened, not submitted" and "Not opened" both exclude finishers —
      // these two groups are the ones worth chasing, and differently.
      if (interviewFilter === "opened" && (c.interviewCompleted || !c.interviewOpenedAt)) return false;
      if (interviewFilter === "notopened" && (c.interviewCompleted || c.interviewOpenedAt)) return false;
      // Reached step one, never submitted, and has not done the assessment
      // either — the group worth chasing back into the form.
      if (
        interviewFilter === "noform" &&
        (c.formCompleted || c.interviewCompleted || c.interviewOpenedAt)
      )
        return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (followUpFilter !== "all" && followUps.get(c.id)?.kind !== followUpFilter) return false;
      if (verifyFilter !== "all" && c.verificationStatus !== verifyFilter) return false;
      // Purely whether they submitted the application form. The "Stalled at
      // step one" option under Interview status is a narrower question — it
      // also excludes anyone who has since opened or done the assessment.
      if (formFilter === "yes" && !c.formCompleted) return false;
      if (formFilter === "no" && c.formCompleted) return false;
      if (mismatchOnly && !isCountryMismatch(c)) return false;
      if (heldOnly && !c.inviteHeld) return false;
      if (from) {
        const applied = new Date(c.submittedAt || c.createdAt).getTime();
        if (applied < from) return false;
      }
      return true;
    });
  }, [rows, search, interviewFilter, statusFilter, dateFrom, countryFilter, followUpFilter, followUps, verifyFilter, mismatchOnly, formFilter, heldOnly]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.fullName.localeCompare(b.fullName) * dir;
        case "country":
          return (a.country || "").localeCompare(b.country || "") * dir;
        case "followup": {
          // Ordered by how much attention each row needs, not by how far the
          // candidate has got: never reminded first, then the longest wait.
          const rank = { needs: 0, waiting: 1, responded: 2, done: 3, none: 4 };
          const fa = followUps.get(a.id)!;
          const fb = followUps.get(b.id)!;
          if (rank[fa.kind] !== rank[fb.kind]) return (rank[fa.kind] - rank[fb.kind]) * dir;
          return ((fb.daysWaiting ?? -1) - (fa.daysWaiting ?? -1)) * dir;
        }
        case "score": {
          // Candidates with no interview sort last regardless of direction —
          // an absent score is not a low score.
          const av = a.interviewCompleted ? (a.score ?? 0) : -1;
          const bv = b.interviewCompleted ? (b.score ?? 0) : -1;
          if (av === -1 && bv === -1) return 0;
          if (av === -1) return 1;
          if (bv === -1) return -1;
          return (av - bv) * dir;
        }
        default:
          return (
            (new Date(a.submittedAt || a.createdAt).getTime() -
              new Date(b.submittedAt || b.createdAt).getTime()) *
            dir
          );
      }
    });
  }, [filtered, sort, followUps]);

  // Paged only after filtering and sorting. The filters have to see every
  // candidate or they answer the wrong question — "nobody awaiting review"
  // would really mean "nobody on this page".
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Derived rather than corrected in an effect: filtering down to three rows
  // while on page 5 must show those three, not an empty table for a frame.
  const current = Math.min(page, pageCount);
  const visible = useMemo(
    () => sorted.slice((current - 1) * pageSize, current * pageSize),
    [sorted, current, pageSize],
  );

  // Previous/Next walk `sorted` — the filtered list in the order on screen —
  // so a reviewer works through exactly what they filtered down to.
  const { profile, open: openProfile, close: closeProfile, nav } = useProfileNav(
    rows,
    sorted,
    pageSize,
    setPage,
  );

  // Scoped to `visible` — the current page — not to `sorted` or `rows`.
  const companyCheck = useBulkCompanyCheck(visible, (id, check) =>
    applyPatch(id, { companyCheck: check }),
  );

  // A document reader belongs to the candidate it was opened from, so stepping
  // to the next one closes it rather than leaving someone else's CV on screen.
  useEffect(() => {
    setViewing(null);
  }, [profile?.id]);

  // Any change to what is being listed sends you back to the front of it.
  useEffect(() => {
    setPage(1);
  }, [search, interviewFilter, statusFilter, dateFrom, countryFilter, followUpFilter, verifyFilter, mismatchOnly, formFilter, heldOnly, pageSize, sort]);

  function goToPage(next: number) {
    setPage(next);
    // Page 4 opened halfway down page 3 is a page you have to scroll up to read.
    tableTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Applied by both the full profile and the verification quick view, so
   * verifying someone from either place updates the row and whichever of the
   * two dialogs happens to be open behind it. The profile reads straight from
   * `rows` by id, so patching the row is all it takes to update the dialog.
   */
  function applyPatch(id: string, patch: Partial<CandidateView>) {
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setQuickView((q) => (q && q.id === id ? { ...q, ...patch } : q));
  }

  async function changeStatus(id: string, status: CandidateStatus) {
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status });
    } catch {
      /* optimistic; ignore */
    }
  }

  async function sendWhatsApp(c: CandidateView) {
    setBusy(c.id);
    const phone = c.phone.replace(/[^\d]/g, "");
    const text = encodeURIComponent(
      buildWhatsAppMessage(c.fullName || "there", withSource(c.interviewLink, "invite-whatsapp")),
    );
    // Record the invitation (and bump status) before opening WhatsApp.
    try {
      await adminPost(`/api/admin/candidates/${c.id}/invite`, {});
      setRows((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                invitationSentAt: new Date().toISOString(),
                status: x.status === "New Application" ? "Interview Invitation Sent" : x.status,
              }
            : x,
        ),
      );
    } catch {
      /* ignore */
    }
    setBusy(null);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function removeCandidate(c: CandidateView) {
    setPendingDelete(null);
    setBusy(c.id);
    try {
      const res = await adminDelete(`/api/admin/candidates/${c.id}`);
      if (res.ok) {
        setRows((prev) => prev.filter((x) => x.id !== c.id));
        if (profile?.id === c.id) closeProfile();
      } else {
        window.alert("Could not delete this candidate. Please try again.");
      }
    } catch {
      window.alert("Could not delete this candidate. Please try again.");
    }
    setBusy(null);
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div>
      {/* Filters */}
      <div className="card mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="search">Search</label>
          <input id="search" className="input" placeholder="Name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="interview">Interview status</label>
          <select id="interview" className="select" value={interviewFilter} onChange={(e) => setInterviewFilter(e.target.value as typeof interviewFilter)}>
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="opened">Opened, not submitted</option>
            <option value="notopened">Not opened</option>
            <option value="noform">Stalled at step one</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="form">Application form</label>
          <select id="form" className="select" value={formFilter} onChange={(e) => setFormFilter(e.target.value as typeof formFilter)}>
            <option value="all">All</option>
            <option value="yes">Completed</option>
            <option value="no">Not completed</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Candidate status</label>
          <select id="status" className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            {CANDIDATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="country">Country</label>
          <select id="country" className="select" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
            <option value="all">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="followup">Follow-up</label>
          <select id="followup" className="select" value={followUpFilter} onChange={(e) => setFollowUpFilter(e.target.value as FollowUpFilter)}>
            {FOLLOW_UP_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="verification">ID verification</label>
          <select id="verification" className="select" value={verifyFilter} onChange={(e) => setVerifyFilter(e.target.value as VerificationFilter)}>
            {VERIFICATION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="datefrom">Applied on or after</label>
          <input id="datefrom" type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        {/* A checkbox rather than another select: there are only two states
            worth asking for, and "no mismatch" is the whole list anyway. */}
        <div className="flex items-end">
          <label htmlFor="mismatch" className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-navy-700">
            <input
              id="mismatch"
              type="checkbox"
              className="h-4 w-4 rounded border-navy-300 text-brand-600"
              checked={mismatchOnly}
              onChange={(e) => setMismatchOnly(e.target.checked)}
            />
            Country mismatch only
          </label>
        </div>
        {/* The queue this feature creates. Without a way to list it you would
            be scanning pages for a badge, and a held invitation nobody sends
            is a candidate who quietly goes elsewhere. */}
        <div className="flex items-end">
          <label htmlFor="held" className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-navy-700">
            <input
              id="held"
              type="checkbox"
              className="h-4 w-4 rounded border-navy-300 text-brand-600"
              checked={heldOnly}
              onChange={(e) => setHeldOnly(e.target.checked)}
            />
            Invitation held only
          </label>
        </div>
      </div>

      {/* Result count + export */}
      <div ref={tableTop} className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* How many the filters left. The running total per page is on the
            pagination line below, where the page controls are. */}
        <p className="text-sm text-navy-500">
          {sorted.length === rows.length ? (
            <>
              <span className="font-semibold text-navy-900">{rows.length}</span> candidate
              {rows.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <span className="font-semibold text-navy-900">{sorted.length}</span> of {rows.length}{" "}
              match your filters
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {/* Beside the export, and deliberately the opposite scope: this one
              covers only the rows on screen. */}
          {companyCheck.control}
          {/* Exports everyone, not this page and not this filter: it is the
              backup route, and a backup of page 1 is not a backup. */}
          <a
            href="/api/admin/export"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
          >
            <Icon name="upload" className="h-4 w-4 rotate-180" />
            Export all as CSV
          </a>
        </div>
      </div>

      {companyCheck.panel}

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <SortHeader label="Candidate" k="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Country" k="country" sort={sort} onSort={toggleSort} />
              <SortHeader label="Applied" k="applied" sort={sort} onSort={toggleSort} />
              <SortHeader label="Interview" k="score" sort={sort} onSort={toggleSort} />
              <SortHeader label="Follow-up" k="followup" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-semibold">Documents</th>
              <th className="px-4 py-3 font-semibold">ID check</th>
              {/* Pinned right so the primary actions stay reachable without
                  scrolling sideways to find them. */}
              <th className="sticky right-0 bg-navy-50 px-4 py-3 font-semibold shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {visible.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-navy-400">No candidates match your filters.</td></tr>
            ) : (
              visible.map((c) => (
                <tr key={c.id} className="group hover:bg-cream-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{c.fullName || "—"}</p>
                    <p className="text-xs text-navy-500">{c.email || "—"}</p>
                    {!c.formCompleted && !c.interviewCompleted && !c.interviewOpenedAt ? (
                      <div className="mt-1">
                        <IncompleteFormBadge />
                      </div>
                    ) : null}
                    {c.inviteHeld ? (
                      <div className="mt-1">
                        <InviteHeldBadge />
                      </div>
                    ) : null}
                    {c.duplicateFlag ? (
                      <span
                        title={`Same phone number as ${c.duplicateOfName ?? "an earlier applicant"}`}
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800"
                      >
                        <Icon name="shield" className="h-3 w-3" />
                        Duplicate · {c.duplicateOfName ?? "unknown"}
                      </span>
                    ) : null}
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
                  <td className="px-4 py-3 text-navy-500">{fmt(c.submittedAt || c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <InterviewBadge completed={c.interviewCompleted} opened={!!c.interviewOpenedAt} />
                    {c.interviewCompleted && c.total ? (
                      <span className="ml-2 text-xs font-semibold text-navy-600">{c.score}/{c.total}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <FollowUpCell state={followUps.get(c.id)!} />
                  </td>
                  <td className="px-4 py-3">
                    <DocumentChips
                      id={c.id}
                      documents={c.documents}
                      onOpen={(doc) => setViewing({ c, doc })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <VerificationBadge
                      status={c.verificationStatus}
                      requestedAt={c.verificationRequestedAt}
                      onOpenPhotos={() => setQuickView(c)}
                    />
                  </td>
                  <td className="sticky right-0 bg-white px-4 py-3 transition-colors group-hover:bg-cream-100 shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => sendWhatsApp(c)}
                        disabled={!c.phone || busy === c.id}
                        title="Send interview link via WhatsApp"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Icon name="chat" className="h-4 w-4" /> WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => openProfile(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(c)}
                        disabled={busy === c.id}
                        title="Delete this candidate permanently"
                        aria-label={`Delete ${c.fullName || "candidate"}`}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                    {c.duplicateFlag || c.interviewEmailSentAt || !c.formCompleted || c.inviteHeld ? (
                      <div className="mt-2">
                        <SendAssessmentButton
                          id={c.id}
                          sentAt={c.interviewEmailSentAt}
                          hasEmail={!!c.email}
                          fullName={c.fullName}
                          email={c.email}
                        />
                      </div>
                    ) : null}
                    <ReminderActions
                      id={c.id}
                      fullName={c.fullName}
                      phone={c.phone}
                      position={c.position}
                      interviewLink={c.interviewLink}
                      interviewCompleted={c.interviewCompleted}
                      interviewEmailSentAt={c.interviewEmailSentAt}
                      formCompleted={c.formCompleted}
                      hasEmail={!!c.email}
                      email={c.email}
                      reminderEmailSentAt={c.reminderEmailSentAt}
                      reminderEmailCount={c.reminderEmailCount}
                      reminderWhatsAppSentAt={c.reminderWhatsAppSentAt}
                      reminderWhatsAppCount={c.reminderWhatsAppCount}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={current}
        pageCount={pageCount}
        total={sorted.length}
        pageSize={pageSize}
        noun="candidate"
        onPage={goToPage}
        onPageSize={setPageSize}
      />

      {/* Profile modal */}
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        icon="trash"
        title="Delete this candidate?"
        confirmLabel="Delete permanently"
        busy={busy === pendingDelete?.id}
        warning="This cannot be undone."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeCandidate(pendingDelete)}
        body={
          <>
            <strong className="text-navy-900">
              {pendingDelete?.fullName || "This candidate"}
            </strong>
            {pendingDelete?.email ? (
              <>
                {" "}
                (<span className="break-all">{pendingDelete.email}</span>)
              </>
            ) : null}{" "}
            will be erased, along with their application, interview answers and notes.
          </>
        }
      />

      {viewing ? (
        <DocumentViewer
          candidateId={viewing.c.id}
          candidateName={viewing.c.fullName}
          document={viewing.doc}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {profile ? (
        <CandidateProfileModal
          key={profile.id}
          candidate={profile}
          nav={nav}
          onClose={closeProfile}
          onOpenDocument={(doc) => setViewing({ c: profile, doc })}
          onStatusChange={changeStatus}
          onSendWhatsApp={sendWhatsApp}
          onChange={(patch) => applyPatch(profile.id, patch)}
        />
      ) : null}

      {quickView ? (
        <VerificationQuickView
          id={quickView.id}
          fullName={quickView.fullName}
          documents={quickView.documents}
          initial={verificationStateOf(quickView)}
          onClose={() => setQuickView(null)}
          onChange={(v) =>
            applyPatch(quickView.id, {
              verificationStatus: v.status,
              verifiedAt: v.verifiedAt,
              verifiedBy: v.verifiedBy,
              rejectedAt: v.rejectedAt,
              rejectionReason: v.rejectionReason,
              imagesDeletedAt: v.imagesDeletedAt,
              verificationRequestedAt: v.requestedAt,
            })
          }
        />
      ) : null}
    </div>
  );
}

/** Column header that toggles sorting, with the active direction shown. */
/**
 * One candidate's follow-up state.
 *
 * Colour carries the urgency so the column can be read without stopping on any
 * single row: grey needs nothing, amber is waiting on you, red has been waiting
 * too long, green worked. The exact wording is in the tooltip.
 */
function FollowUpCell({ state }: { state: FollowUpState }) {
  if (state.kind === "none" || state.kind === "done") {
    return <span className="text-xs text-navy-300">—</span>;
  }

  // A single ignored reminder is a nudge; several, or one left for a week, is
  // a candidate going cold.
  const stale = state.kind === "waiting" && ((state.daysWaiting ?? 0) >= 7 || state.reminderCount >= 3);

  const style =
    state.kind === "needs"
      ? "bg-navy-50 text-navy-600 border-navy-200"
      : state.kind === "responded"
        ? "bg-green-50 text-green-700 border-green-200"
        : stale
          ? "bg-red-50 text-red-700 border-red-200"
          : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span
      title={state.detail}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${style}`}
    >
      {state.kind === "responded" ? <Icon name="checkCircle" className="h-3 w-3" /> : null}
      {state.label}
    </span>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <th className="px-4 py-3 font-semibold">
      <button
        type="button"
        onClick={() => onSort(k)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`inline-flex items-center gap-1 transition hover:text-navy-900 ${
          active ? "text-navy-900" : ""
        }`}
      >
        {label}
        <span aria-hidden="true" className={active ? "text-brand-600" : "text-navy-300"}>
          {active ? (sort.dir === "asc" ? "\u2191" : "\u2193") : "\u2195"}
        </span>
      </button>
    </th>
  );
}

