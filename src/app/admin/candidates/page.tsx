import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { CandidatesTable } from "@/components/admin/CandidatesTable";

export const metadata: Metadata = { title: "Candidates", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminCandidatesPage() {
  await requireAdmin();
  const base = await baseUrl();
  const candidates = await listCandidates();
  const required = await requiredCountries();

  const views = candidates.map((c) => toCandidateView(c, base, required));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Candidates</h1>
        <p className="mt-1 text-sm text-navy-500">{views.length} total — search, filter, and manage applicants.</p>
      </header>
      <CandidatesTable candidates={views} />
    </AdminShell>
  );
}
