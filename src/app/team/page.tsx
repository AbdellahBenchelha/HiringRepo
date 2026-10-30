import type { Metadata } from "next";
import Link from "next/link";
import { requireMember } from "@/lib/teamAuth";
import { accrueMember, getMember, getTeamSettings, getWork } from "@/lib/teamStore";
import { checkInDay, entryAmount, localDate, rateOn, totals, weekStart, weeklyEarnings } from "@/lib/teamHours";
import {
  ONBOARDING_LABEL,
  ONBOARDING_STEPS,
  describePayday,
  formatDateTime,
  formatDay,
  formatHours,
  formatLongDay,
  formatUsd,
  hoursCountedFrom,
  nextPayday,
} from "@/lib/teamShared";
import { onboardingProgress, onboardingState } from "@/lib/teamView";
import { windowInCompanyTime, formatDays, formatWindow } from "@/lib/availability";
import { PortalShell } from "@/components/team/PortalShell";
import { EarningsChart } from "@/components/team/EarningsChart";
import { DayOffForm } from "@/components/team/DayOffForm";
import { ActionButton } from "@/components/team/ActionButton";
import { Empty, Section, Stat, WorkPill } from "@/components/team/ui";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Dashboard" };

const STEP_LINK = { profile: "/profile", mailbox: "/mail", bank: "/bank", rules: "/rules" } as const;

export default async function TeamDashboard() {
  const signedIn = await requireMember();
  await accrueMember(signedIn.id);
  const member = (await getMember(signedIn.id)) ?? signedIn;
  const [work, settings] = await Promise.all([getWork(member.id), getTeamSettings()]);

  const today = localDate(member.schedule.timeZone);
  const week = weekStart(today);
  const month = today.slice(0, 7);
  const all = totals(work.entries, work.adjustments, work.payments);
  const thisWeek = totals(work.entries.filter((e) => e.date >= week), [], []);
  const thisMonth = totals(
    work.entries.filter((e) => e.date.startsWith(month)),
    work.adjustments.filter((a) => a.date.startsWith(month)),
    [],
  );
  const rate = rateOn(member.rates, today);
  const payday = nextPayday(settings.payday, today);

  const steps = onboardingState(member, settings);
  const progress = onboardingProgress(steps);

  const checkIn = member.checkInRequired && member.status === "active" ? checkInDay(member.schedule, Date.now()) : null;
  const checkedIn = checkIn ? work.checkIns.some((c) => c.date === checkIn) : false;

  return (
    <PortalShell
      member={member}
      active="dashboard"
      title={`Hello, ${member.fullName.split(/\s+/)[0]}`}
      intro={member.status === "active" ? "Your hours and earnings, updated automatically after each work day." : null}
    >
      <div className="space-y-6">
        {member.status !== "active" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Your account is <strong>paused</strong>. No work days are added while it is paused.
          </p>
        ) : null}

        <div className="card flex flex-wrap items-center gap-4" data-start-card>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
            <Icon name="calendar" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-400">Your first work day</p>
            <p className="font-display text-lg font-extrabold text-navy-900" data-start-date>{formatLongDay(member.firstWorkDay)}</p>
            <p className="text-sm text-navy-500" data-start-note>
              {(() => {
                const from = hoursCountedFrom(member);
                if (!from) return "Your hours are counted once your account is active — add your bank details first.";
                if (from > today) return `Your account is active. Your hours are counted from ${formatLongDay(from)}.`;
                return `Your account is active. Hours counted since ${formatLongDay(from)}.`;
              })()}
            </p>
          </div>
        </div>

        {progress.done < progress.total ? (
          <Section title="Get started" action={<span className="text-sm text-navy-500">{progress.done} of {progress.total} done</span>}>
            <ol className="grid gap-2 sm:grid-cols-2">
              {ONBOARDING_STEPS.filter((s) => steps[s] !== "skip").map((s, i) => (
                <li key={s}>
                  <Link
                    href={STEP_LINK[s]}
                    data-step={s}
                    data-state={steps[s]}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition hover:border-brand-300 ${
                      steps[s] === "done" ? "border-green-200 bg-green-50 text-green-900" : "border-cream-300 bg-white text-navy-800"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        steps[s] === "done" ? "bg-green-600 text-white" : "bg-cream-200 text-navy-600"
                      }`}
                    >
                      {steps[s] === "done" ? <Icon name="check" className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className="font-semibold">{ONBOARDING_LABEL[s]}</span>
                    {s === "bank" && steps[s] !== "done" ? (
                      <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white" data-step-required>
                        Required
                      </span>
                    ) : null}
                    {steps[s] === "waiting" ? <span className="ml-auto text-xs text-navy-400">Not ready yet</span> : null}
                  </Link>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {member.checkInRequired && member.status === "active" ? (
          <div className="card flex flex-wrap items-center justify-between gap-4" data-checkin>
            <div>
              <p className="font-semibold text-navy-900">Daily check-in</p>
              <p className="text-sm text-navy-500">
                {checkIn
                  ? checkedIn
                    ? `You started work for ${formatDay(checkIn)}. Have a good day!`
                    : `Press Start work to have ${formatDay(checkIn)} counted.`
                  : "Your next check-in opens one hour before your work window."}
              </p>
            </div>
            {checkIn && !checkedIn ? (
              <ActionButton url="/api/team/work" body={{ action: "checkin" }}>
                <Icon name="clock" className="h-4 w-4" /> Start work
              </ActionButton>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Rate" value={`${formatUsd(rate)}/h`} hint={`${formatHours(member.hoursPerDay)} per work day`} />
          <Stat label="This week" value={formatUsd(thisWeek.earned)} hint={formatHours(thisWeek.hours)} />
          <Stat label="This month" value={formatUsd(thisMonth.earned + thisMonth.adjustments)} hint={formatHours(thisMonth.hours)} />
          <Stat label="Balance to be paid" value={formatUsd(all.balance)} hint={`Next payday: ${formatDay(payday)}`} strong />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Total hours" value={formatHours(all.hours)} />
          <Stat label="Total earned" value={formatUsd(all.earned)} />
          <Stat label="Bonuses & deductions" value={formatUsd(all.adjustments)} />
          <Stat label="Total paid" value={formatUsd(all.paid)} hint={describePayday(settings.payday)} />
        </div>

        <EarningsChart weeks={weeklyEarnings(work.entries, work.adjustments, today)} />

        <Section title="Your schedule">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-navy-400">Days</dt>
              <dd className="font-semibold text-navy-900">{formatDays(member.schedule.days)}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Your time ({member.schedule.timeZone})</dt>
              <dd className="font-semibold text-navy-900">{formatWindow(member.schedule)}</dd>
            </div>
            <div>
              <dt className="text-navy-400">UK time</dt>
              <dd className="font-semibold text-navy-900">{windowInCompanyTime(member.schedule)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-navy-400">
            Each work day is added automatically when your window ends. First work day: {formatDay(member.firstWorkDay)}.
          </p>
        </Section>

        <Section title="Work days">
          {work.entries.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm" data-work-table>
                <thead className="text-xs text-navy-400">
                  <tr>
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Hours</th>
                    <th className="py-2 text-right font-medium">Rate</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {work.entries.slice(0, 60).map((e) => (
                    <tr key={e.id} className="border-t border-cream-200">
                      <td className="py-2">{formatDay(e.date)}</td>
                      <td className="py-2">
                        <WorkPill status={e.status} />
                        {e.note ? <span className="ml-2 text-xs text-navy-400">{e.note}</span> : null}
                      </td>
                      <td className="py-2 text-right">{formatHours(e.hours)}</td>
                      <td className="py-2 text-right">{formatUsd(e.rate)}</td>
                      <td className="py-2 text-right font-semibold">{formatUsd(entryAmount(e))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {work.entries.length > 60 ? (
                <p className="mt-2 text-xs text-navy-400">Older days are in your monthly statements (Documents).</p>
              ) : null}
            </div>
          ) : (
            <Empty>No work days yet. Your first one is added when your window ends on {formatDay(member.firstWorkDay)}.</Empty>
          )}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Payments">
            {work.payments.length ? (
              <ul className="divide-y divide-cream-200 text-sm">
                {work.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {formatDay(p.date)}
                      <span className="block text-xs text-navy-400">{[p.sentTo, p.reference].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="font-semibold text-navy-900">{formatUsd(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No payments yet. Next payday: {formatDay(payday)}.</Empty>
            )}
          </Section>
          <Section title="Bonuses & deductions">
            {work.adjustments.length ? (
              <ul className="divide-y divide-cream-200 text-sm">
                {work.adjustments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <span>
                      {formatDay(a.date)}
                      <span className="block text-xs text-navy-400">{a.reason}</span>
                    </span>
                    <span className={`font-semibold ${a.amount < 0 ? "text-red-700" : "text-green-700"}`}>
                      {a.amount > 0 ? "+" : ""}
                      {formatUsd(a.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None yet.</Empty>
            )}
          </Section>
        </div>

        <Section title="Days off">
          {member.status === "active" ? <DayOffForm min={today} /> : null}
          {work.dayOffs.length ? (
            <ul className="mt-4 divide-y divide-cream-200 text-sm" data-dayoffs>
              {work.dayOffs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span>
                    <strong className="text-navy-900">{formatDay(d.date)}</strong>
                    {d.reason ? <span className="ml-2 text-navy-500">{d.reason}</span> : null}
                    <span className="block text-xs text-navy-400">
                      Asked {formatDateTime(d.requestedAt)}
                      {d.note ? ` · ${d.note}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        d.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : d.status === "refused"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {d.status === "approved" ? "Approved" : d.status === "refused" ? "Not approved" : "Waiting"}
                    </span>
                    {d.status === "pending" ? (
                      <ActionButton
                        url="/api/team/work"
                        body={{ action: "cancel_dayoff", id: d.id }}
                        className="text-xs font-semibold text-navy-500 hover:text-red-700"
                      >
                        Cancel
                      </ActionButton>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      </div>
    </PortalShell>
  );
}
