"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { StatusBadge, InterviewBadge } from "@/components/admin/StatusBadge";
import { CANDIDATE_STATUSES, type CandidateStatus } from "@/lib/candidateStatus";
import { siteConfig } from "@/config/site";
import { adminPost } from "@/lib/adminClient";

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
  const [interviewFilter, setInterviewFilter] = useState<"all" | "completed" | "pending">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CandidateStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [profile, setProfile] = useState<CandidateView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    return rows.filter((c) => {
      if (q && ![c.fullName, c.email, c.phone].some((v) => v.toLowerCase().includes(q))) return false;
      if (interviewFilter === "completed" && !c.interviewCompleted) return false;
      if (interviewFilter === "pending" && c.interviewCompleted) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (from) {
        const applied = new Date(c.submittedAt || c.createdAt).getTime();
        if (applied < from) return false;
      }
      return true;
    });
  }, [rows, search, interviewFilter, statusFilter, dateFrom]);

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
            <option value="pending">Not completed</option>
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
          <label className="label" htmlFor="datefrom">Applied on or after</label>
          <input id="datefrom" type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 font-semibold">Languages</th>
              <th className="px-4 py-3 font-semibold">Applied</th>
              <th className="px-4 py-3 font-semibold">Interview</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-400">No candidates match your filters.</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-900">{c.fullName || "—"}</p>
                    <p className="text-xs text-navy-500">{c.email || "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-700">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-navy-600">{c.languages.length ? c.languages.join(", ") : "—"}</td>
                  <td className="px-4 py-3 text-navy-500">{fmt(c.submittedAt || c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <InterviewBadge completed={c.interviewCompleted} />
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
                  <td className="px-4 py-3">
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
                    </div>
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
                  <InterviewBadge completed={profile.interviewCompleted} />
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
