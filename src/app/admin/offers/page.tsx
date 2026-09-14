import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { OffersTable } from "@/components/admin/OffersTable";
import { offerAwaitingReply, offerUnaccepted } from "@/lib/offerReminder";

export const metadata: Metadata = { title: "Offers", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminOffersPage() {
  await requireAdmin();
  const [all, required, base] = await Promise.all([
    listCandidates(),
    requiredCountries(),
    baseUrl(),
  ]);

  /**
   * Offers that did not become a hire: no answer yet, or a no.
   *
   * Accepting is what takes somebody off this list — they move to the Accepted
   * tab, where the next steps are.
   */
  const open = all.filter(offerUnaccepted);
  // Still waiting first, oldest offer at the top, as the table keeps them.
  open.sort((a, b) => {
    const wait = Number(!offerAwaitingReply(a)) - Number(!offerAwaitingReply(b));
    if (wait !== 0) return wait;
    return (a.offerSentAt || "").localeCompare(b.offerSentAt || "");
  });

  const rows = open.map((c) => toCandidateView(c, base, required));
  const waiting = open.filter(offerAwaitingReply).length;
  const declined = open.length - waiting;

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Offers</h1>
        <p className="mt-1 text-sm text-navy-500">
          {rows.length === 0 ? (
            "Every offer sent has been accepted."
          ) : (
            <>
              {waiting} waiting on an answer
              {declined > 0 ? `, ${declined} declined` : ""}. Accepting moves somebody to the
              Accepted tab.
            </>
          )}
        </p>
      </header>

      <OffersTable rows={rows} />
    </AdminShell>
  );
}
