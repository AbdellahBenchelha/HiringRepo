import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { manualInviteCountries } from "@/lib/manualInviteStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { CandidatesTable } from "@/components/admin/CandidatesTable";

export const metadata: Metadata = { title: "Candidates", robots: { index: false, follow: false } };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const base = await baseUrl();
  const [candidates, required, manualInvite] = await Promise.all([
    listCandidates(),
    requiredCountries(),
    manualInviteCountries(),
  ]);

  const views = candidates.map((c) => toCandidateView(c, base, required, manualInvite));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Candidates</h1>
        <p className="mt-1 text-sm text-navy-500">{views.length} total — search, filter, and manage applicants.</p>
      </header>
      {/* The dashboard's "needs attention" panel links straight to a filtered
          list, so the number you clicked is the list you land on. */}
      <CandidatesTable
        candidates={views}
        initialVerify={one(params.verify)}
        initialHeld={one(params.held) === "1"}
      />
    </AdminShell>
  );
}
