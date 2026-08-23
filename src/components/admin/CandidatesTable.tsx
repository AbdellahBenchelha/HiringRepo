"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusBadge, InterviewBadge } from "@/components/admin/StatusBadge";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@/lib/candidateStatus";
import { siteConfig } from "@/config/site";
import { adminPost, adminDelete } from "@/lib/adminClient";
import { SendAssessmentButton } from "@/components/admin/SendAssessmentButton";
import { ReminderActions } from "@/components/admin/ReminderActions";

type SortKey = "applied" | "name" | "country" | "position" | "score";

export interface CandidateView {
  id: string;
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  linkedin: string;
  languages: string[];
  position: string;
  status: CandidateStatus;
  createdAt: string;
  submittedAt?: string;
  invitationSentAt?: string;
  interviewCompleted: boolean;
  score?: number;
  total?: number;
  interviewLink: string;
  notes?: string;
  interviewOpenedAt?: string;
  reminderEmailSentAt?: string;
  reminderEmailCount?: number;
  reminderWhatsAppSentAt?: string;
  reminderWhatsAppCount?: number;
  duplicateFlag?: boolean;
  duplicateOfName?: string;
  interviewEmailSentAt?: string;
}

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

export function CandidatesTable({ candidates }: { candidates: CandidateView[] }) {
  const [rows, setRows] = useState(candidates);
  const [search, setSearch] = useState("");
  const [interviewFilter, setInterviewFilter] = useState<"all" | "completed" | "opened" | "notopened">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CandidateStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [profile, setProfile] = useState<CandidateView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<"all" | string>("all");
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
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (from) {
        const applied = new Date(c.submittedAt || c.createdAt).getTime();
        if (applied < from) return false;
      }
      return true;
    });
  }, [rows, search, interviewFilter, statusFilter, dateFrom, countryFilter]);

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return a.fullName.localeCompare(b.fullName) * dir;
        case "country":
          return (a.country || "").localeCompare(b.country || "") * dir;
        case "position":
          return (a.position || "").localeCompare(b.position || "") * dir;
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
  }, [filtered, sort]);

  async function changeStatus(id: string, status: CandidateStatus) {
    setRows((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setProfile((p) => (p && p.id === id ? { ...p, status } : p));
    try {
      await adminPost(`/api/admin/candidates/${id}/status`, { status });
    } catch {
      /* optimistic; ignore */
    }
  }

  async function sendWhatsApp(c: CandidateView) {
    setBusy(c.id);
    const phone = c.phone.replace(/[^\d]/g, "");
    const text = encodeURIComponent(buildWhatsAppMessage(c.fullName || "there", c.interviewLink));
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
    // Deleting personal data has no undo, so the name has to be in the prompt
    // — "are you sure?" on the wrong row is how the wrong person gets erased.
    const ok = window.confirm(
      `Permanently delete ${c.fullName || "this candidate"}?\n\n` +
        `Their application, interview answers and notes will be erased. This cannot be undone.`,
    );
    if (!ok) return;
    setBusy(c.id);
    try {
      const res = await adminDelete(`/api/admin/candidates/${c.id}`);
      if (res.ok) {
        setRows((prev) => prev.filter((x) => x.id !== c.id));
        setProfile((p) => (p && p.id === c.id ? null : p));
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
          <label className="label" htmlFor="datefrom">Applied on or after</label>
          <input id="datefrom" type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
      </div>

      {/* Result count + export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-500">
          Showing <span className="font-semibold text-navy-900">{sorted.length}</span>
          {sorted.length !== rows.length ? ` of ${rows.length}` : ""} candidate
          {sorted.length === 1 ? "" : "s"}
        </p>
        <a
          href="/api/admin/export"
          className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800"
        >
          <Icon name="upload" className="h-4 w-4 rotate-180" />
          Export all as CSV
        </a>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <SortHeader label="Candidate" k="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Country" k="country" sort={sort} onSort={toggleSort} />
              <SortHeader label="Position" k="position" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <SortHeader label="Applied" k="applied" sort={sort} onSort={toggleSort} />
              <SortHeader label="Interview" k="score" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-semibold">Status</th>
              {/* Pinned right: with Country and Position added the table is wider
                  than most screens, and the primary actions must stay reachable
                  without scrolling sideways to find them. */}
              <th className="sticky right-0 bg-navy-50 px-4 py-3 font-semibold shadow-[-8px_0_8px_-8px_rgba(15,16,53,0.12)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-navy-400">No candidates match your filters.</td></tr>
            ) : (
              sorted.map((c) => (
                <tr key={c.id} className="group hover:bg-cream-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{c.fullName || "—"}</p>
                    <p className="text-xs text-navy-500">{c.email || "—"}</p>
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
                  </td>
                  <td className="px-4 py-3 text-navy-700">{c.position || "—"}</td>
                  <td className="px-4 py-3 text-navy-700">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-navy-500">{fmt(c.submittedAt || c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <InterviewBadge completed={c.interviewCompleted} opened={!!c.interviewOpenedAt} />
                    {c.interviewCompleted && c.total ? (
                      <span className="ml-2 text-xs font-semibold text-navy-600">{c.score}/{c.total}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => changeStatus(c.id, e.target.value as CandidateStatus)}
                      className="select !w-auto !py-1.5 text-xs"
                      aria-label="Change status"
                    >
                      {CANDIDATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                        onClick={() => setProfile(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-2.5 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCandidate(c)}
                        disabled={busy === c.id}
                        title="Delete this candidate permanently"
                        aria-label={`Delete ${c.fullName || "candidate"}`}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-2 py-1.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                    {c.duplicateFlag || c.interviewEmailSentAt ? (
                      <div className="mt-2">
                        <SendAssessmentButton
                          id={c.id}
                          sentAt={c.interviewEmailSentAt}
                          hasEmail={!!c.email}
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
                      hasEmail={!!c.email}
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

      {/* Profile modal */}
      {profile ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4" onClick={() => setProfile(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-navy-900">{profile.fullName || "Candidate"}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={profile.status} />
                  <InterviewBadge completed={profile.interviewCompleted} opened={!!profile.interviewOpenedAt} />
                </div>
              </div>
              <button type="button" onClick={() => setProfile(null)} className="rounded-lg p-2 text-navy-500 hover:bg-navy-100" aria-label="Close">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Email" value={profile.email} />
              <Field label="WhatsApp number" value={profile.phone} />
              <Field label="Date of birth" value={profile.dob} />
              <Field label="Position" value={profile.position} />
              <Field label="Country" value={profile.country} />
              <Field label="City" value={profile.city} />
              <Field label="Full address" value={profile.address} full />
              <Field label="Languages" value={profile.languages.join(", ")} full />
              <Field
                label="LinkedIn"
                full
                value={
                  profile.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                      {profile.linkedin}
                    </a>
                  ) : ""
                }
              />
              <Field label="Applied" value={fmt(profile.submittedAt || profile.createdAt)} />
              <Field label="Invitation sent" value={fmt(profile.invitationSentAt)} />
            </dl>

            <NotesEditor
              id={profile.id}
              initial={profile.notes ?? ""}
              onSaved={(notes) => {
                setRows((prev) => prev.map((c) => (c.id === profile.id ? { ...c, notes } : c)));
                setProfile((p) => (p ? { ...p, notes } : p));
              }}
            />

            <div className="mt-5 rounded-xl border border-navy-100 bg-navy-50/50 p-4">
              <p className="text-sm font-semibold text-navy-800">Interview</p>
              {profile.interviewCompleted ? (
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm text-navy-600">Score: <strong>{profile.score}/{profile.total}</strong></p>
                  <Link href={`/admin/interviews/${profile.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                    View full results →
                  </Link>
                </div>
              ) : (
                <p className="mt-1 text-sm text-navy-500">Not completed yet.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => sendWhatsApp(profile)}
                disabled={!profile.phone}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Icon name="chat" className="h-4 w-4" /> Send interview link via WhatsApp
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-navy-900">{value || "—"}</dd>
    </div>
  );
}

/** Column header that toggles sorting, with the active direction shown. */
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

/**
 * Recruiter notes on a candidate.
 *
 * Saved explicitly rather than on every keystroke: each write rewrites the
 * whole candidate file, so autosaving mid-sentence would rewrite it once per
 * character typed.
 */
function NotesEditor({
  id,
  initial,
  onSaved,
}: {
  id: string;
  initial: string;
  onSaved: (notes: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Switching candidate must not carry the previous one's notes across.
  useEffect(() => {
    setValue(initial);
    setState("idle");
  }, [id, initial]);

  async function save() {
    setState("saving");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/notes`, { notes: value });
      if (res.ok) {
        setState("saved");
        onSaved(value);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  const dirty = value !== initial;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <label htmlFor={`notes-${id}`} className="text-sm font-semibold text-navy-800">
          Recruiter notes
        </label>
        {state === "saved" && !dirty ? (
          <span className="text-xs font-semibold text-green-700">Saved</span>
        ) : null}
        {state === "error" ? (
          <span className="text-xs font-semibold text-red-600">Could not save</span>
        ) : null}
      </div>
      <textarea
        id={`notes-${id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        rows={3}
        placeholder="Call outcomes, availability, anything worth remembering…"
        className="textarea mt-2 !min-h-[5rem]"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
