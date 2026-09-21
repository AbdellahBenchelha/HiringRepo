import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { manualInviteCountries } from "@/lib/manualInviteStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { CandidatesTable } from "@/components/admin/CandidatesTable";

export const metadata: Metadata = { title: "Favorites", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * The people somebody starred.
 *
 * Cuts across every other tab on purpose. The rest of the Admin Panel is
 * organised by where a candidate is in the process — waiting, offered,
 * accepted — and this is organised by a recruiter having decided somebody is
 * worth coming back to, which can happen at any of those points and does not
 * move them out of the list they belong in.
 *
 * It reuses the Candidates table rather than having a plainer one of its own,
 * because a favourite is still a candidate: you want the same View info, the
 * same filters and the same actions. A stripped-down second table would mean
 * finding somebody here and then going to look for them somewhere else to do
 * anything about them.
 */
export default async function AdminFavoritesPage() {
  await requireAdmin();
  const base = await baseUrl();
  const [candidates, required, manualInvite] = await Promise.all([
    listCandidates(),
    requiredCountries(),
    manualInviteCountries(),
  ]);

  const starred = candidates.filter((c) => c.favorite);
  // Most recently starred first — but only as the order they are handed over
  // in. The table sorts itself by last activity and has its own controls, so
  // this decides ties rather than the view, which is why the heading below
  // does not promise an order it cannot keep.
  starred.sort((a, b) => (b.favoritedAt ?? "").localeCompare(a.favoritedAt ?? ""));

  const views = starred.map((c) => toCandidateView(c, base, required, manualInvite));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Favorite candidates</h1>
        <p className="mt-1 text-sm text-navy-500">
          {views.length === 0 ? (
            <>
              Nobody is starred yet. Open a candidate&rsquo;s View info and press the star beside
              their name to keep them here.
            </>
          ) : (
            <>
              {views.length} starred {views.length === 1 ? "candidate" : "candidates"} — the same
              search, filters and actions as the Candidates tab.
            </>
          )}
        </p>
      </header>

      {views.length > 0 ? <CandidatesTable candidates={views} /> : null}
    </AdminShell>
  );
}
