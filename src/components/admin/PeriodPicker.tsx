import Link from "next/link";
import { PERIODS, type PeriodId, type Range } from "@/lib/analytics";

/**
 * Which stretch of time the whole dashboard is describing.
 *
 * The period lives in the URL rather than in component state, which makes it a
 * server component with no JavaScript: each choice is a link, the page
 * re-renders with the new figures, and the result can be bookmarked or sent to
 * someone. A client-side picker would mean shipping the whole dashboard's data
 * to the browser to re-filter it.
 *
 * The custom range is a plain GET form for the same reason — the browser's own
 * date pickers, submitted by the browser itself, with nothing to go wrong.
 */
export function PeriodPicker({
  active,
  range,
  today,
}: {
  active: PeriodId;
  range: Range;
  /** Nothing can be reported from the future, so that is where the inputs stop. */
  today: string;
}) {
  return (
    <div className="card">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <Link
            key={p.id}
            href={p.id === "7d" ? "/admin" : `/admin?period=${p.id}`}
            scroll={false}
            aria-current={active === p.id ? "page" : undefined}
            className={
              active === p.id
                ? "rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white"
                : "rounded-full border border-navy-200 px-3.5 py-1.5 text-xs font-semibold text-navy-600 transition hover:bg-navy-50"
            }
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form
        action="/admin"
        method="get"
        className="mt-3 flex flex-wrap items-end gap-3 border-t border-navy-100 pt-3"
      >
        <input type="hidden" name="period" value="custom" />
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-navy-400">
            From
          </span>
          <input
            type="date"
            name="from"
            max={today}
            defaultValue={active === "custom" ? range.from : ""}
            className="input !w-auto !py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-navy-400">
            To
          </span>
          <input
            type="date"
            name="to"
            max={today}
            defaultValue={active === "custom" ? range.to : ""}
            className="input !w-auto !py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-full border border-navy-200 px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
        >
          Apply range
        </button>
        {active === "custom" ? (
          <span className="pb-2 text-xs font-semibold text-brand-700">Showing a custom range</span>
        ) : null}
      </form>
    </div>
  );
}
