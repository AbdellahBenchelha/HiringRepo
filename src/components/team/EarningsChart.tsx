import { formatDay, formatHours, formatUsd } from "@/lib/teamShared";

/**
 * Earnings per week, last twelve weeks: one series, one hue, bars from a
 * shared baseline. Each bar answers on hover or keyboard focus, the latest
 * week is labelled, and the same numbers sit in a table underneath for
 * anyone who would rather read than look.
 */
export function EarningsChart({ weeks }: { weeks: { week: string; amount: number; hours: number }[] }) {
  const max = Math.max(...weeks.map((w) => w.amount), 0);
  const last = weeks.at(-1);
  return (
    <figure className="card">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-navy-900">Earnings per week</span>
        <span className="text-xs text-navy-400">Last 12 weeks · US dollars</span>
      </figcaption>
      {max === 0 ? (
        <p className="mt-6 text-sm text-navy-500">Your weekly earnings will show here after your first work day.</p>
      ) : (
        <>
          <div className="relative mt-8 h-40" role="img" aria-label="Bar chart of earnings per week; the table below has the numbers.">
            {/* Recessive guides at the top and middle. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-cream-300" />
            <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-cream-300" />
            <span className="absolute -top-5 left-0 text-[11px] text-navy-400">{formatUsd(max)}</span>
            <div className="absolute inset-0 flex items-end gap-[2px] border-b border-cream-400">
              {weeks.map((w) => {
                const h = w.amount > 0 ? Math.max(2, Math.round((w.amount / max) * 100)) : 0;
                return (
                  <div key={w.week} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none">
                    <div
                      className="w-full max-w-[28px] rounded-t-[4px] bg-[#b06e0c] transition-opacity group-hover:opacity-80 group-focus:opacity-80"
                      style={{ height: `${h}%` }}
                    />
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-card group-hover:block group-focus:block">
                      Week of {formatDay(w.week, false)}
                      <br />
                      <strong>{formatUsd(w.amount)}</strong> · {formatHours(w.hours)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-navy-400">
            <span>{formatDay(weeks[0].week, false)}</span>
            {last ? (
              <span>
                This week: <strong className="text-navy-700">{formatUsd(last.amount)}</strong>
              </span>
            ) : null}
          </div>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-navy-500 hover:text-navy-900">Show as a table</summary>
            <table className="mt-2 w-full text-left">
              <thead className="text-xs text-navy-400">
                <tr>
                  <th className="py-1 font-medium">Week of</th>
                  <th className="py-1 text-right font-medium">Hours</th>
                  <th className="py-1 text-right font-medium">Earned</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week} className="border-t border-cream-200">
                    <td className="py-1">{formatDay(w.week)}</td>
                    <td className="py-1 text-right">{formatHours(w.hours)}</td>
                    <td className="py-1 text-right">{formatUsd(w.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </figure>
  );
}
