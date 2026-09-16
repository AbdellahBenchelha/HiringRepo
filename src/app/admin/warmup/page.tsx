import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { WarmupPanel } from "@/components/admin/WarmupPanel";
import { buildWarmupStats } from "@/lib/warmupStats";

export const metadata: Metadata = { title: "Warm-up", robots: { index: false, follow: false } };

/**
 * How much mail may leave today, and whether it is safe to send more tomorrow.
 *
 * Rendered on the server so the page is right the moment it opens rather than
 * after a fetch — the number this page exists to show is the one somebody is
 * about to make a decision on.
 */
export default async function AdminWarmupPage() {
  await requireAdmin();
  const stats = await buildWarmupStats();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Warm-up</h1>
        <p className="mt-1 text-sm text-navy-500">
          workroute.co.uk is a new sending domain. Mailbox providers decide where its mail lands by
          watching the first few weeks, so volume rises slowly and only while the numbers hold.
        </p>
      </header>
      <WarmupPanel initial={stats} />
    </AdminShell>
  );
}
