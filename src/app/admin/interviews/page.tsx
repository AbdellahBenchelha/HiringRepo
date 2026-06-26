import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";

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
  const completed = (await listCandidates()).filter((c) => c.interview);

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Interviews</h1>
        <p className="mt-1 text-sm text-navy-500">{completed.length} completed interview{completed.length === 1 ? "" : "s"}.</p>
      </header>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-100 bg-navy-50/50 text-xs uppercase tracking-wide text-navy-500">
              <th className="px-4 py-3 font-semibold">Candidate</th>
              <th className="px-4 py-3 font-semibold">Completed</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Percentage</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Results</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {completed.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-400">No completed interviews yet.</td></tr>
            ) : (
              completed.map((c) => {
                const p = pct(c.interview!.score, c.interview!.total);
                return (
                  <tr key={c.id} className="hover:bg-navy-50/40">
                    <td className="px-4 py-3 font-medium text-navy-900">{c.fullName || "—"}</td>
                    <td className="px-4 py-3 text-navy-500">{fmt(c.interview!.completedAt)}</td>
                    <td className="px-4 py-3 font-semibold text-navy-800">{c.interview!.score}/{c.interview!.total}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${p >= 60 ? "text-green-600" : p >= 40 ? "text-amber-600" : "text-red-600"}`}>{p}%</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
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
