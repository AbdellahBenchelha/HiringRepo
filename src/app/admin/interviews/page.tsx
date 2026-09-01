import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { requiredCountries } from "@/lib/verificationStore";
import { toCandidateView } from "@/lib/candidateView";
import { verificationStatus } from "@/lib/verification";
import { getMessageTemplates } from "@/lib/messageStore";
import { buildVars, TEMPLATE_KEYS, type TemplateKey } from "@/lib/messageTemplates";
import { AdminShell } from "@/components/admin/AdminShell";
import { InterviewsTable, type InterviewRow } from "@/components/admin/InterviewsTable";

export const metadata: Metadata = { title: "Interviews", robots: { index: false, follow: false } };

async function baseUrl(): Promise<string> {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function AdminInterviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireAdmin();
  const [params, all, saved, required, base] = await Promise.all([
    searchParams,
    listCandidates(),
    getMessageTemplates(),
    requiredCountries(),
    baseUrl(),
  ]);
  const finished = all.filter((c) => c.interview);

  /**
   * Nobody has told this candidate they need to verify — so there is nothing
   * to follow up on yet, and this tab is for following up. Same condition the
   * red "Not asked yet" badge uses: verification is due, and no request has
   * gone out.
   */
  const notAsked = (c: (typeof finished)[number]) =>
    verificationStatus(c, required) === "awaiting" && !c.verificationRequestedAt;

  // Hidden by default, but never silently: the count below says how many and
  // links to them, or a candidate simply vanishes with no explanation. The
  // filters in the table narrow whatever survives this.
  const showAll = params.show === "all";
  const hidden = finished.filter(notAsked);
  const listed = showAll ? finished : finished.filter((c) => !notAsked(c));

  // Flatten to bodies once for the whole table rather than per row.
  const templates = Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, saved[k].body])) as Record<
    TemplateKey,
    string
  >;

  const rows: InterviewRow[] = listed.map((c) => ({
    view: toCandidateView(c, base, required),
    vars: buildVars(c),
  }));

  return (
    <AdminShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Interviews</h1>
          <p className="mt-1 text-sm text-navy-500">
            {rows.length} completed interview{rows.length === 1 ? "" : "s"}
            {hidden.length > 0 ? (
              showAll ? (
                <>
                  , including {hidden.length} with no ID check requested.{" "}
                  <Link href="/admin/interviews" className="font-semibold text-brand-700 underline">
                    Hide them
                  </Link>
                </>
              ) : (
                <>
                  . {hidden.length} hidden — ID check not requested yet.{" "}
                  <Link
                    href="/admin/interviews?show=all"
                    className="font-semibold text-brand-700 underline"
                  >
                    Show {hidden.length === 1 ? "it" : "them"}
                  </Link>
                </>
              )
            ) : (
              "."
            )}
          </p>
        </div>
        <Link href="/admin/settings/messages" className="btn-secondary !px-4 !py-2 text-sm">
          Edit WhatsApp messages
        </Link>
      </header>

      <InterviewsTable rows={rows} templates={templates} />
    </AdminShell>
  );
}
