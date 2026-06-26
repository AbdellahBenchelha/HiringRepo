import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates, CANDIDATE_STATUSES } from "@/lib/store";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge, InterviewBadge } from "@/components/admin/StatusBadge";
import { Icon, type IconName } from "@/components/Icon";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminDashboard() {
  await requireAdmin();
  const candidates = await listCandidates();

  const total = candidates.length;
  const completed = candidates.filter((c) => c.interview).length;
  const pending = total - completed;
  const accepted = candidates.filter((c) => c.status === "Accepted").length;

  const byStatus = CANDIDATE_STATUSES.map((s) => ({
    status: s,
    count: candidates.filter((c) => c.status === s).length,
  }));
  const maxCount = Math.max(1, ...byStatus.map((b) => b.count));

  const recent = candidates.slice(0, 6);

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-navy-500">Recruitment overview and recent activity.</p>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total candidates" value={total} icon="users" tone="brand" />
        <StatCard label="Completed interviews" value={completed} icon="checkCircle" tone="green" />
        <StatCard label="Interview not completed" value={pending} icon="clock" tone="amber" />
        <StatCard label="Accepted" value={accepted} icon="trophy" tone="teal" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Status distribution */}
        <section className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">Candidates by status</h2>
          <div className="mt-4 space-y-3">
            {byStatus.map((b) => (
              <div key={b.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600">{b.status}</span>
                  <span className="font-semibold text-navy-900">{b.count}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent candidates */}
        <section className="card lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-navy-900">Recent candidates</h2>
            <Link href="/admin/candidates" className="text-sm font-medium text-brand-700 hover:text-brand-800">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-navy-500">No candidates yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                    <th className="pb-2 pr-3 font-semibold">Candidate</th>
                    <th className="pb-2 pr-3 font-semibold">Applied</th>
                    <th className="pb-2 pr-3 font-semibold">Interview</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {recent.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3 font-medium text-navy-900">{c.fullName || "—"}</td>
                      <td className="py-2.5 pr-3 text-navy-500">{fmt(c.submittedAt || c.createdAt)}</td>
                      <td className="py-2.5 pr-3"><InterviewBadge completed={!!c.interview} /></td>
                      <td className="py-2.5"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: IconName;
  tone: "brand" | "green" | "amber" | "teal";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="card flex items-center gap-4">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none text-navy-900">{value}</p>
        <p className="mt-1 text-sm text-navy-500">{label}</p>
      </div>
    </div>
  );
}
