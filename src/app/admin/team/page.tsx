import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { memberRows } from "@/lib/teamAdminData";
import { bankCryptoReady } from "@/lib/teamCrypto";
import { MEMBER_STATUS_LABEL, formatDateTime, formatUsd } from "@/lib/teamShared";
import { currentRate } from "@/lib/teamStore";
import { teamPortalUrl } from "@/lib/teamHost";
import { TeamFilter } from "@/components/admin/team/TeamFilter";
import { listMail } from "@/lib/teamMail";

export const metadata: Metadata = { title: "Team", robots: { index: false, follow: false } };

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  const { q = "", status = "active" } = await searchParams;
  const all = await memberRows();
  const unknownMail = (await listMail(null, "inbox")).length;
  const needle = q.trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (status === "all" || r.member.status === status) &&
      (!needle ||
        [r.member.fullName, r.member.loginEmail, r.member.workEmail, r.member.phoneNumber, r.member.country]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(needle))),
  );
  const counts = {
    all: all.length,
    active: all.filter((r) => r.member.status === "active").length,
    paused: all.filter((r) => r.member.status === "paused").length,
    left: all.filter((r) => r.member.status === "left").length,
  };

  return (
    <AdminShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Team</h1>
          <p className="mt-1 text-sm text-navy-500">
            The people working with us, and their portal at{" "}
            <a href={teamPortalUrl()} className="link" target="_blank" rel="noopener noreferrer">
              {teamPortalUrl().replace(/^https?:\/\//, "")}
            </a>
            . Add someone with Add to team on the hiring panel&rsquo;s Accepted tab, or by hand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/team/unknown-mail" className="btn-secondary py-2.5" data-unknown-mail>
            Mail to unknown addresses{unknownMail ? ` (${unknownMail})` : ""}
          </Link>
          <Link href="/admin/team/settings" className="btn-secondary py-2.5">
            Settings & announcements
          </Link>
          <Link href="/admin/team/new" className="btn-primary py-2.5">
            Add member
          </Link>
        </div>
      </header>

      {!bankCryptoReady() ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Bank details cannot be saved:</strong> TEAM_BANK_KEY is not set in Railway. Add it (64 hex characters) and redeploy,
          and keep a copy of it somewhere safe.
        </p>
      ) : null}

      <TeamFilter q={q} status={status} counts={counts} />

      <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm" data-team-table>
          <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Work email · phone</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3">Getting started</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map(({ member: m, totals: t, onboarding: o, unreadTickets }) => (
                <tr key={m.id} className="border-t border-navy-100 hover:bg-navy-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/team/${m.id}`} className="font-semibold text-navy-900 hover:underline">
                      {m.fullName}
                    </Link>
                    <p className="text-xs text-navy-500">{m.loginEmail}</p>
                    {unreadTickets ? (
                      <span className="mt-1 inline-flex rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        {unreadTickets} unread ticket{unreadTickets === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        m.status === "active" ? "bg-green-100 text-green-800" : m.status === "paused" ? "bg-amber-100 text-amber-900" : "bg-navy-100 text-navy-600"
                      }`}
                    >
                      {MEMBER_STATUS_LABEL[m.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="text-navy-800">{m.workEmail || <span className="text-navy-400">No mailbox yet</span>}</p>
                    <p className="text-navy-500">{m.phoneNumber || <span className="text-navy-400">No number yet</span>}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatUsd(currentRate(m))}/h</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${o.done === o.total ? "text-green-700" : "text-amber-800"}`}>
                      {o.done} of {o.total}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {m.bankPending ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Waiting for approval</span>
                    ) : m.bank ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 font-semibold text-green-800">Approved</span>
                    ) : (
                      <span className="text-navy-400">Not added</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-900">{formatUsd(t.balance)}</td>
                  <td className="px-4 py-3 text-xs text-navy-500">
                    {m.lastSignInAt ? formatDateTime(m.lastSignInAt) : m.invitedAt ? "Invited, not signed in" : "Not invited"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-navy-500">
                  {all.length ? "Nobody matches." : "Nobody on the team yet. Use Add to team on the hiring panel’s Accepted tab."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
