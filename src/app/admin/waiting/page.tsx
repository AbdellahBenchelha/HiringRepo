import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { toCandidateView } from "@/lib/candidateView";
import { AdminShell } from "@/components/admin/AdminShell";
import { WaitingTable } from "@/components/admin/WaitingTable";
import { awaitingDecision, daysWaiting, WAITING_TOO_LONG_DAYS } from "@/lib/voiceAck";

export const metadata: Metadata = { title: "Waiting", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminWaitingPage() {
  await requireAdmin();
  const [all, required, base] = await Promise.all([
    listCandidates(),
    requiredCountries(),
    baseUrl(),
  ]);

  /**
   * Everybody we have promised an answer to and not given one.
   *
   * They leave this list by being offered the job or being turned down —
   * which is the point. A tab you can only empty by making a decision is the
   * only kind that keeps anybody honest.
   */
  const waiting = all.filter(awaitingDecision);
  // Longest wait first, the same order the table keeps.
  waiting.sort((a, b) => (a.voiceAckSentAt || "").localeCompare(b.voiceAckSentAt || ""));

  const rows = waiting.map((c) => toCandidateView(c, base, required));
  const longest = waiting.length ? daysWaiting(waiting[0]) : 0;

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Waiting</h1>
        <p className="mt-1 text-sm text-navy-500">
          {rows.length === 0 ? (
            "Nobody is waiting on an answer from us."
          ) : (
            <>
              {rows.length} {rows.length === 1 ? "person has" : "people have"} been told their
              recording arrived and are waiting to hear back
              {longest > 0 ? (
                <>
                  {" — the longest for "}
                  <strong className={longest >= WAITING_TOO_LONG_DAYS ? "text-red-700" : ""}>
                    {longest} day{longest === 1 ? "" : "s"}
                  </strong>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </header>

      <WaitingTable rows={rows} />
    </AdminShell>
  );
}
