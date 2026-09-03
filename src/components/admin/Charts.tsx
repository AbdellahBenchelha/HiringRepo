/**
 * The dashboard's charts, drawn by hand in SVG.
 *
 * No charting library on purpose. Every one of them is a runtime dependency
 * measured in hundreds of kilobytes, needs its colours and fonts wrestled into
 * matching the rest of the panel, and several want to load themselves from a
 * CDN — which the site's content-security policy refuses, correctly. A bar
 * chart is forty lines of arithmetic; the icons in this project are hand-drawn
 * for the same reason.
 *
 * Server components: these render to markup once and ship no JavaScript at
 * all. A tooltip that follows the mouse would be worth a client bundle; a
 * `<title>` on each bar, which the browser shows on hover for free, is not.
 */

/** Bars fill this box; the browser scales it to whatever width it lands in. */
const W = 900;
const H = 260;
const PAD = { top: 12, right: 8, bottom: 26, left: 40 };

function niceCeiling(max: number): number {
  if (max <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= max) return candidate;
  }
  return 10 * magnitude;
}

export interface TrendPoint {
  /** Axis label, already shortened for display. */
  label: string;
  /** Full description for the hover title. */
  title: string;
  visitors: number;
  views: number;
  applications: number;
}

/**
 * Traffic and applications on one pair of axes.
 *
 * They belong together: a spike in visitors that produced no applications and
 * one that produced twenty look identical on separate charts, and knowing
 * which it was is the entire reason to look. Applications are drawn as a line
 * over the bars — usually a much smaller number, so bars of their own would be
 * invisible against the traffic.
 */
export function TrendChart({
  points,
  hourly,
}: {
  points: TrendPoint[];
  /** Hourly views have no visitor figure to draw; say so rather than draw a flat zero. */
  hourly?: boolean;
}) {
  if (points.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const top = niceCeiling(Math.max(1, ...points.map((p) => (hourly ? p.views : p.visitors))));
  const appTop = niceCeiling(Math.max(1, ...points.map((p) => p.applications)));

  const slot = plotW / points.length;
  const barW = Math.max(1, Math.min(38, slot * 0.62));
  const y = (value: number, scale: number) => PAD.top + plotH - (value / scale) * plotH;
  const cx = (i: number) => PAD.left + slot * i + slot / 2;

  // At most eight labels, or a 90-day range prints an unreadable smear.
  const labelEvery = Math.ceil(points.length / 8);
  const anyApplications = points.some((p) => p.applications > 0);

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(p.applications, appTop).toFixed(1)}`)
    .join(" ");

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full sm:h-64" role="img"
        aria-label={`${hourly ? "Views" : "Visitors"} and applications over time`}>
        {/* Four gridlines with their values, so a bar can be read without a tooltip. */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={PAD.top + plotH * (1 - f)} y2={PAD.top + plotH * (1 - f)}
              className="stroke-navy-100" strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={PAD.top + plotH * (1 - f) + 4}
              textAnchor="end" className="fill-navy-400 text-[11px]"
            >
              {Math.round(top * f)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const value = hourly ? p.views : p.visitors;
          const barH = Math.max(value > 0 ? 2 : 0, PAD.top + plotH - y(value, top));
          return (
            <rect
              key={p.label + i}
              x={cx(i) - barW / 2}
              y={PAD.top + plotH - barH}
              width={barW}
              height={barH}
              rx={Math.min(3, barW / 2)}
              className="fill-brand-500"
            >
              <title>{p.title}</title>
            </rect>
          );
        })}

        {anyApplications ? (
          <>
            <path d={line} fill="none" className="stroke-navy-900" strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) =>
              p.applications > 0 ? (
                <circle key={`d${i}`} cx={cx(i)} cy={y(p.applications, appTop)} r={3}
                  className="fill-navy-900">
                  <title>{p.title}</title>
                </circle>
              ) : null,
            )}
          </>
        ) : null}

        {points.map((p, i) =>
          i % labelEvery === 0 ? (
            <text key={`l${i}`} x={cx(i)} y={H - 8} textAnchor="middle"
              className="fill-navy-400 text-[11px]">
              {p.label}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="mt-2 flex flex-wrap items-center gap-4 text-xs text-navy-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
          {hourly ? "Page views" : "Visitors"}
        </span>
        {anyApplications ? (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-navy-900" />
            Applications started
            <span className="text-navy-400">(own scale, peak {appTop})</span>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/**
 * The shape of a run of numbers, inside a stat tile.
 *
 * No axes and no labels — at this size it answers "rising or falling", and
 * anything more precise belongs on the chart above.
 */
export function Sparkline({ values, tone = "brand" }: { values: number[]; tone?: "brand" | "navy" }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 28;
  const step = w / (values.length - 1);
  const point = (v: number, i: number) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 3) - 1.5).toFixed(1)}`;
  const line = values.map(point).join(" ");
  const stroke = tone === "navy" ? "stroke-navy-900" : "stroke-brand-500";
  const fill = tone === "navy" ? "fill-navy-900/10" : "fill-brand-500/10";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden="true" preserveAspectRatio="none">
      <polygon points={`0,${h} ${line} ${w},${h}`} className={fill} />
      <polyline points={line} fill="none" className={stroke} strokeWidth={1.5}
        strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A labelled row with a proportional bar. Countries, sources, pages, devices. */
export function BreakdownList({
  rows,
  total,
  empty,
  unit,
}: {
  rows: { key: string; count: number }[];
  total: number;
  empty: string;
  unit?: string;
}) {
  if (rows.length === 0) return <p className="mt-4 text-sm text-navy-500">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <ul className="mt-4 space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-navy-700" title={r.key}>
              {r.key}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-navy-900">
              {r.count.toLocaleString("en-GB")}
              {total > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-navy-400">
                  {Math.round((r.count / total) * 100)}%
                </span>
              ) : null}
              {unit ? <span className="ml-1 text-xs font-normal text-navy-400">{unit}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
            <div className="h-full rounded-full bg-brand-400" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
