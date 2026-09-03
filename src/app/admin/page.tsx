import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates, CANDIDATE_STATUSES } from "@/lib/store";
import { manualInviteCountries } from "@/lib/manualInviteStore";
import { requiredCountries } from "@/lib/verificationStore";
import { countryRuleApplies } from "@/lib/phoneCountry";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { StatTile } from "@/components/admin/StatTile";
import { TrendChart, BreakdownList, type TrendPoint } from "@/components/admin/Charts";
import { Icon, type IconName } from "@/components/Icon";
import { buildFunnel, applicationCounts, attentionCounts } from "@/lib/funnel";
import { readRange, firstRecordedDay } from "@/lib/analyticsStore";
import {
  dayKey,
  daysInRange,
  resolvePeriod,
  previousRange,
  granularityOf,
  totalsOf,
  topEntries,
  isPeriodId,
  ratio,
  TZ,
  type PeriodId,
  type DayStats,
} from "@/lib/analytics";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

/**
 * Never cached. Every figure on this page is "as of now", and a dashboard
 * showing this morning's numbers this afternoon is worse than no dashboard.
 */
export const dynamic = "force-dynamic";

function fmtDay(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const today = dayKey(new Date());
  const periodParam = one(params.period);
  // Last 7 days by default: today alone is too small a sample to mean much,
  // and the month is too coarse to notice anything changing.
  const period: PeriodId = isPeriodId(periodParam) ? periodParam : "7d";
  const range = resolvePeriod(period, today, { from: one(params.from), to: one(params.to) });
  const before = previousRange(range);

  const [candidates, held, required, days, earlier, since] = await Promise.all([
    listCandidates(),
    manualInviteCountries(),
    requiredCountries(),
    readRange(range.from, range.to),
    readRange(before.from, before.to),
    firstRecordedDay(),
  ]);

  const now = totalsOf(days);
  const prev = totalsOf(earlier);
  const apps = applicationCounts(candidates, range);
  const appsBefore = applicationCounts(candidates, before);
  const funnel = buildFunnel(candidates, range);
  const attention = attentionCounts(candidates, held, countryRuleApplies, required);

  const byStatus = CANDIDATE_STATUSES.map((s) => ({
    status: s,
    count: candidates.filter((c) => c.status === s).length,
  }));
  const maxStatus = Math.max(1, ...byStatus.map((b) => b.count));

  // Applications per day, so the trend line can sit over the traffic bars.
  const appsPerDay = new Map<string, number>();
  for (const c of candidates) {
    const key = dayKey(new Date(c.createdAt));
    appsPerDay.set(key, (appsPerDay.get(key) ?? 0) + 1);
  }

  const granularity = granularityOf(range);
  const points = buildPoints(days, granularity, appsPerDay);

  const spark = days.map((d) => d.visitors);
  const viewSpark = days.map((d) => d.views);

  // Traffic before this date simply was not counted; saying so stops an empty
  // chart being read as a collapse in visitors.
  const partial = !!since && since > range.from;

  return (
    <AdminShell>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-navy-500">
          {range.from === range.to ? fmtDay(range.from) : `${fmtDay(range.from)} — ${fmtDay(range.to)}`}
          <span className="text-navy-400">
            {" · "}
            {daysInRange(range.from, range.to).length} day
            {daysInRange(range.from, range.to).length === 1 ? "" : "s"}, Morocco time
          </span>
        </p>
      </header>

      <PeriodPicker active={period} range={range} today={today} />

      {partial ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Visitor figures only start on <strong>{fmtDay(since!)}</strong>, when counting was
          switched on. Earlier days in this range show zero because nobody was counted then, not
          because nobody came. Application figures below go back further.
        </p>
      ) : null}

      {/* ---------------------------------------------------------------- *
          Traffic, and what it produced
       * ---------------------------------------------------------------- */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Visitors"
          value={now.visitors}
          previous={prev.visitors}
          spark={spark}
          hint={
            days.length > 1
              ? "Counted fresh each day, so someone returning during the period counts once per day."
              : undefined
          }
        />
        <StatTile label="Page views" value={now.views} previous={prev.views} spark={viewSpark} />
        <StatTile
          label="Pages per visitor"
          value={now.visitors > 0 ? Math.round((now.views / now.visitors) * 10) / 10 : 0}
          previous={prev.visitors > 0 ? Math.round((prev.views / prev.visitors) * 10) / 10 : undefined}
        />
        <StatTile
          label="Applications started"
          value={apps.started}
          previous={appsBefore.started}
          tone="navy"
        />
        <StatTile
          label="Applications completed"
          value={apps.submitted}
          previous={appsBefore.submitted}
          tone="navy"
        />
        <StatTile
          label="Visitors who applied"
          value={ratio(apps.started, now.visitors)}
          suffix="%"
          previous={prev.visitors > 0 ? ratio(appsBefore.started, prev.visitors) : undefined}
          tone="navy"
          hint="The number that decides whether more traffic is worth buying."
        />
      </div>

      <section className="card mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-navy-900">
            {granularity === "hour" ? "Through the day" : "Traffic and applications"}
          </h2>
          <p className="text-xs text-navy-400">
            {granularity === "hour"
              ? "Page views by hour, Morocco time"
              : granularity === "month"
                ? "By month"
                : "By day"}
          </p>
        </div>
        {now.views === 0 && apps.started === 0 ? (
          <p className="mt-4 text-sm text-navy-500">Nothing recorded in this period.</p>
        ) : (
          <TrendChart points={points} hourly={granularity === "hour"} />
        )}
      </section>

      {/* ---------------------------------------------------------------- *
          Where they went, and how far
       * ---------------------------------------------------------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card min-w-0 lg:col-span-3">
          <h2 className="text-lg font-semibold text-navy-900">Hiring funnel</h2>
          <p className="mt-1 text-xs text-navy-500">
            What happened in this period. Hiring takes weeks, so the offers here mostly belong to
            people who applied earlier — these are stages reached, not one group followed through.
          </p>
          <ul className="mt-4 space-y-3">
            {funnel.map((stage) => (
              <li key={stage.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-navy-700">{stage.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-navy-900">
                    {stage.count}
                    {stage.dropped !== null && stage.dropped > 0 ? (
                      <span className="ml-2 text-xs font-normal text-red-500">
                        −{stage.dropped}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-navy-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, stage.share)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card min-w-0 lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">Needs attention</h2>
          <p className="mt-1 text-xs text-navy-500">
            Waiting right now, whenever it arrived — not filtered by the period above.
          </p>
          <div className="mt-4 space-y-2">
            <Attention
              label="Invitations held to send by hand"
              count={attention.inviteHeld}
              href="/admin/candidates?held=1"
              icon="clock"
            />
            <Attention
              label="Identity checks to review"
              count={attention.idToReview}
              href="/admin/candidates?verify=provided"
              icon="shield"
            />
            <Attention
              label="Offers sent, no reply yet"
              count={attention.offersWaiting}
              href="/admin/interviews"
              icon="mail"
            />
            <Attention
              label="Accepted, details not confirmed"
              count={attention.acceptedUnconfirmed}
              href="/admin/accepted"
              icon="users"
            />
          </div>
        </section>
      </div>

      {/* ---------------------------------------------------------------- *
          Who they are and where they came from
       * ---------------------------------------------------------------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card min-w-0">
          <h2 className="text-lg font-semibold text-navy-900">Countries</h2>
          <BreakdownList
            rows={topEntries(now.countries, 8)}
            total={Object.values(now.countries).reduce((a, b) => a + b, 0)}
            empty="No countries resolved yet. Visitors are only looked up on their first visit of the day."
          />
        </section>

        <section className="card min-w-0">
          <h2 className="text-lg font-semibold text-navy-900">How they found us</h2>
          <BreakdownList
            rows={topEntries(now.referrers, 8)}
            total={now.views}
            empty="No traffic recorded in this period."
          />
        </section>

        <section className="card min-w-0">
          <h2 className="text-lg font-semibold text-navy-900">Device</h2>
          <BreakdownList
            rows={[
              { key: "Mobile", count: now.devices.mobile },
              { key: "Desktop", count: now.devices.desktop },
            ].filter((r) => r.count > 0)}
            total={now.devices.mobile + now.devices.desktop}
            empty="No traffic recorded in this period."
          />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card min-w-0 lg:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-navy-900">Most viewed pages</h2>
            <p className="text-xs text-navy-400">Which roles attract the clicks</p>
          </div>
          <BreakdownList
            rows={topEntries(now.pages, 10)}
            total={now.views}
            empty="No page views recorded in this period."
          />
        </section>

        <section className="card min-w-0 lg:col-span-2">
          <h2 className="text-lg font-semibold text-navy-900">Candidates by status</h2>
          <p className="mt-1 text-xs text-navy-500">Everyone on file, all time.</p>
          <div className="mt-4 space-y-2.5">
            {byStatus.map((b) => (
              <div key={b.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy-600">{b.status}</span>
                  <span className="font-semibold tabular-nums text-navy-900">{b.count}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(b.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Latest applications</h2>
          <Link href="/admin/candidates" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </div>
        {candidates.length === 0 ? (
          <p className="mt-4 text-sm text-navy-500">No candidates yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                  <th className="pb-2 pr-3 font-semibold">Candidate</th>
                  <th className="pb-2 pr-3 font-semibold">Country</th>
                  <th className="pb-2 pr-3 font-semibold">Applied</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {candidates.slice(0, 6).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3 font-medium text-navy-900">{c.fullName || "—"}</td>
                    <td className="py-2.5 pr-3 text-navy-500">{c.country || "—"}</td>
                    <td className="py-2.5 pr-3 text-navy-500">
                      {fmtDay(dayKey(new Date(c.submittedAt || c.createdAt)))}
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-navy-400">
        Visitors are counted on this server only — no third party, no analytics cookie, and no IP
        address is stored. Each visitor&rsquo;s daily identifier is rebuilt from a secret that is
        replaced every midnight ({TZ}), so nobody can be followed from one day to the next. Known
        bots and link previews are excluded, as is the admin panel itself.
      </p>
    </AdminShell>
  );
}

/**
 * Fold the days into whatever the chart is drawing: hours for a single day,
 * days for a few months, months beyond that. A year drawn as 365 bars is a
 * smear that answers nothing.
 */
function buildPoints(
  days: DayStats[],
  granularity: "hour" | "day" | "month",
  appsPerDay: Map<string, number>,
): TrendPoint[] {
  if (granularity === "hour") {
    const day = days[0];
    if (!day) return [];
    return day.hours.map((views, hour) => ({
      label: `${String(hour).padStart(2, "0")}`,
      title: `${String(hour).padStart(2, "0")}:00 — ${views} view${views === 1 ? "" : "s"}`,
      visitors: 0,
      views,
      // The whole day's applications belong to no single hour, so the line
      // stays flat here rather than inventing a distribution.
      applications: 0,
    }));
  }

  if (granularity === "day") {
    return days.map((d) => ({
      label: fmtDay(d.day).replace(/ \d{4}$/, ""),
      title: `${fmtDay(d.day)} — ${d.visitors} visitor${d.visitors === 1 ? "" : "s"}, ${d.views} view${d.views === 1 ? "" : "s"}, ${appsPerDay.get(d.day) ?? 0} application${(appsPerDay.get(d.day) ?? 0) === 1 ? "" : "s"}`,
      visitors: d.visitors,
      views: d.views,
      applications: appsPerDay.get(d.day) ?? 0,
    }));
  }

  const months = new Map<string, TrendPoint>();
  for (const d of days) {
    const key = d.day.slice(0, 7);
    const point =
      months.get(key) ??
      {
        label: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        title: "",
        visitors: 0,
        views: 0,
        applications: 0,
      };
    point.visitors += d.visitors;
    point.views += d.views;
    point.applications += appsPerDay.get(d.day) ?? 0;
    months.set(key, point);
  }
  return [...months.entries()].map(([key, p]) => ({
    ...p,
    title: `${new Date(`${key}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })} — ${p.visitors} visitors, ${p.views} views, ${p.applications} applications`,
  }));
}

function Attention({
  label,
  count,
  href,
  icon,
}: {
  label: string;
  count: number;
  href: string;
  icon: IconName;
}) {
  const quiet = count === 0;
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        quiet
          ? "border-navy-100 hover:bg-navy-50"
          : "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          quiet ? "bg-navy-50 text-navy-400" : "bg-amber-100 text-amber-700"
        }`}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-navy-700">{label}</span>
      <span
        className={`shrink-0 text-lg font-bold tabular-nums ${quiet ? "text-navy-300" : "text-amber-800"}`}
      >
        {count}
      </span>
    </Link>
  );
}
