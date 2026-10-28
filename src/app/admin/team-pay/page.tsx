import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { memberRows } from "@/lib/teamAdminData";
import { getTeamSettings, getWork } from "@/lib/teamStore";
import { describePayday, formatDateTime, formatDay, formatUsd, nextPayday } from "@/lib/teamShared";
import { bankLabel } from "@/lib/teamView";
import { AdminAction } from "@/components/admin/team/AdminAction";
import { Empty, Section, Stat } from "@/components/team/ui";

export const metadata: Metadata = { title: "Hours & pay", robots: { index: false, follow: false } };

/**
 * Everything about money in one place: what each member is owed, and the
 * decisions waiting — bank accounts, days off, and days without a check-in.
 */
export default async function AdminTeamPayPage() {
  await requireAdmin();
  const [rows, work, settings] = await Promise.all([memberRows(), getWork(), getTeamSettings()]);
  const byId = new Map(rows.map((r) => [r.member.id, r.member]));
  const today = new Date().toISOString().slice(0, 10);
  const payday = nextPayday(settings.payday, today);

  const bankPending = rows.filter((r) => r.member.bankPending);
  const dayOffs = work.dayOffs.filter((d) => d.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
  const noCheckIn = work.entries.filter((e) => e.status === "no_checkin" && !e.editedAt).sort((a, b) => b.date.localeCompare(a.date));
  const owed = rows.filter((r) => r.totals.balance > 0);
  const totalOwed = owed.reduce((s, r) => s + r.totals.balance, 0);

  return (
    <AdminShell>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Hours & pay</h1>
          <p className="mt-1 text-sm text-navy-500">
            Payday: {describePayday(settings.payday)} — next {formatDay(payday)}.{" "}
            <Link href="/admin/team/settings" className="link">
              Change
            </Link>
          </p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Owed to the team" value={formatUsd(totalOwed)} strong />
        <Stat label="People to pay" value={owed.length} />
        <Stat label="Bank accounts to approve" value={bankPending.length} />
        <Stat label="Days off to answer" value={dayOffs.length} />
      </div>

      <div className="space-y-6">
        {bankPending.length ? (
          <Section title="Bank accounts waiting for approval">
            <ul className="divide-y divide-navy-100 text-sm">
              {bankPending.map(({ member: m }) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{m.fullName}</strong> — {bankLabel(m.bankPending)} · sent {formatDateTime(m.bankPending!.submittedAt)}
                    {m.bank ? <span className="ml-2 text-xs font-semibold text-amber-800">changing from {bankLabel(m.bank)}</span> : null}
                  </span>
                  <Link href={`/admin/team/${m.id}?tab=bank`} className="btn-secondary py-1.5 text-xs">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Days off to answer">
          {dayOffs.length ? (
            <ul className="divide-y divide-navy-100 text-sm" data-pay-dayoffs>
              {dayOffs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{byId.get(d.memberId)?.fullName ?? "Unknown"}</strong> — {formatDay(d.date)}
                    {d.reason ? ` · ${d.reason}` : ""}
                  </span>
                  <span className="flex gap-2">
                    <AdminAction url="/api/admin/team/work" body={{ action: "decide_dayoff", id: d.id, approve: true }}>
                      Approve
                    </AdminAction>
                    <AdminAction url="/api/admin/team/work" body={{ action: "decide_dayoff", id: d.id, approve: false }} ask="A note for them (optional):" askField="note">
                      Refuse
                    </AdminAction>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>None waiting.</Empty>
          )}
        </Section>

        {noCheckIn.length ? (
          <Section title="Work days without a check-in">
            <p className="mb-3 text-sm text-navy-500">Not paid unless you say so. Pay the day if they worked and forgot to press Start work.</p>
            <ul className="divide-y divide-navy-100 text-sm">
              {noCheckIn.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <strong>{byId.get(e.memberId)?.fullName ?? "Unknown"}</strong> — {formatDay(e.date)}
                  </span>
                  <span className="flex gap-2">
                    <AdminAction url="/api/admin/team/work" body={{ action: "approve_entry", id: e.id }}>
                      Pay this day
                    </AdminAction>
                    <AdminAction url="/api/admin/team/work" body={{ action: "edit_entry", id: e.id, status: "absent" }}>
                      Mark absent
                    </AdminAction>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Balances">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm" data-balances>
                <thead className="text-xs uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="py-2">Member</th>
                    <th className="py-2">Pay into</th>
                    <th className="py-2 text-right">Hours</th>
                    <th className="py-2 text-right">Earned</th>
                    <th className="py-2 text-right">Paid</th>
                    <th className="py-2 text-right">Balance</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ member: m, totals: t }) => (
                    <tr key={m.id} className="border-t border-navy-100">
                      <td className="py-2">
                        <Link href={`/admin/team/${m.id}?tab=hours`} className="font-semibold text-navy-900 hover:underline">
                          {m.fullName}
                        </Link>
                        {m.status !== "active" ? <span className="ml-2 text-xs text-navy-400">{m.status}</span> : null}
                      </td>
                      <td className="py-2 text-xs">
                        {m.bank ? bankLabel(m.bank) : <span className="text-amber-800">No approved account</span>}
                      </td>
                      <td className="py-2 text-right">{t.hours} h</td>
                      <td className="py-2 text-right">{formatUsd(t.earned + t.adjustments)}</td>
                      <td className="py-2 text-right">{formatUsd(t.paid)}</td>
                      <td className="py-2 text-right font-bold text-navy-900">{formatUsd(t.balance)}</td>
                      <td className="py-2 text-right">
                        <Link href={`/admin/team/${m.id}?tab=hours`} className="text-xs font-semibold text-brand-700 hover:underline">
                          Record payment
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nobody on the team yet.</Empty>
          )}
        </Section>
      </div>
    </AdminShell>
  );
}
