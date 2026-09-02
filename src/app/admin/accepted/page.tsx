import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { AcceptedTable } from "@/components/admin/AcceptedTable";

export const metadata: Metadata = { title: "Accepted", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminAcceptedPage() {
  await requireAdmin();
  const [all, required, base] = await Promise.all([
    listCandidates(),
    requiredCountries(),
    baseUrl(),
  ]);

  // Accepted is accepted, however it was recorded: through the link in the
  // offer email, or by the recruiter after a call.
  const accepted = all.filter((c) => c.offerAcceptedAt);
  // Most recently accepted first — the newest one is the one being acted on.
  accepted.sort((a, b) => (b.offerAcceptedAt || "").localeCompare(a.offerAcceptedAt || ""));

  const rows = accepted.map((c) => toCandidateView(c, base, required));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Accepted</h1>
        <p className="mt-1 text-sm text-navy-500">
          {rows.length} {rows.length === 1 ? "person has" : "people have"} accepted an offer.
        </p>
      </header>

      <AcceptedTable rows={rows} />
    </AdminShell>
  );
}
