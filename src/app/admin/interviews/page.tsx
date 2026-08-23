import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { getMessageTemplates } from "@/lib/messageStore";
import { buildVars, TEMPLATE_KEYS, type TemplateKey } from "@/lib/messageTemplates";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InterviewActions } from "@/components/admin/InterviewActions";

export const metadata: Metadata = { title: "Interviews", robots: { index: false, follow: false } };

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function pct(score: number, total: number) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

export default async function AdminInterviewsPage() {
  await requireAdmin();
  const [all, saved] = await Promise.all([listCandidates(), getMessageTemplates()]);
  const completed = all.filter((c) => c.interview);

  // Flatten to bodies once for the whole table rather than per row.
  const templates = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, saved[k].body])) as Record<
    TemplateKey,
    string
  >;

  return (
    <AdminShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Interviews</h1>
          <p className="mt-1 text-sm text-navy-500">{completed.length} completed interview{completed.length === 1 ? "" : "s"}.</p>
        </div>
        <Link href="/admin/settings/messages" className="btn-secondary !px-4 !py-2 text-sm">
          Edit WhatsApp messages
        </Link>
      </header>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Completed</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">%</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Follow-up (WhatsApp)</th>
              <th className="px-4 py-3 font-semibold">Results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {completed.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-navy-400">No completed interviews yet.</td></tr>
            ) : (
              completed.map((c) => {
                const p = pct(c.interview!.score, c.interview!.total);
                return (
                  <tr key={c.id} className="align-top hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-medium text-navy-900">
                      {c.fullName || "—"}
                      <span className="mt-0.5 block text-xs font-normal text-navy-500">{c.phone || "no number"}</span>
                    </td>
                    <td className="px-4 py-3 text-navy-500">{fmt(c.interview!.completedAt)}</td>
                    <td className="px-4 py-3 font-semibold text-navy-800">{c.interview!.score}/{c.interview!.total}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p >= 60 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600"}`}>{p}%</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <InterviewActions
                        id={c.id}
                        fullName={c.fullName}
                        phone={c.phone}
                        successMessageSentAt={c.successMessageSentAt}
                        voiceRequestedAt={c.voiceRequestedAt}
                        voiceStatus={c.voiceStatus}
                        templates={templates}
                        vars={buildVars(c)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/interviews/${c.id}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
