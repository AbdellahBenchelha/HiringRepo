import { Icon } from "@/components/Icon";
import { Sparkline } from "@/components/admin/Charts";

/**
 * One headline figure, its movement, and its recent shape.
 *
 * The number on its own says almost nothing — 400 visitors is good or bad
 * depending entirely on last week — so the comparison is part of the tile
 * rather than something to go and look up.
 *
 * When there is nothing to compare against, it says so. Growth from zero is
 * not "+100%": it is a first week, and printing a percentage there would
 * manufacture a trend out of an empty file.
 */
export function StatTile({
  label,
  value,
  previous,
  suffix,
  spark,
  tone = "brand",
  hint,
}: {
  label: string;
  value: number;
  /** The same figure over the equal-length period before. */
  previous?: number;
  suffix?: string;
  spark?: number[];
  tone?: "brand" | "navy";
  /** A caveat that belongs with the number, not in a footnote. */
  hint?: string;
}) {
  const change =
    previous === undefined || previous === 0 ? null : Math.round(((value - previous) / previous) * 100);
  const up = change !== null && change > 0;
  const flat = change === 0;

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        {spark && spark.length > 1 ? <Sparkline values={spark} tone={tone} /> : null}
      </div>

      <p className="mt-2 text-3xl font-bold leading-none tabular-nums text-navy-900">
        {value.toLocaleString("en-GB")}
        {suffix ? <span className="ml-1 text-lg font-semibold text-navy-400">{suffix}</span> : null}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {change === null ? (
          <span className="text-navy-400">
            {previous === undefined ? "" : "No figure for the period before"}
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                flat ? "text-navy-400" : up ? "text-green-600" : "text-red-600"
              }`}
            >
              {!flat ? (
                <Icon
                  name={up ? "chevronUp" : "chevronDown"}
                  className="h-3.5 w-3.5"
                />
              ) : null}
              {flat ? "No change" : `${Math.abs(change)}%`}
            </span>
            <span className="text-navy-400">
              vs {previous?.toLocaleString("en-GB")} before
            </span>
          </>
        )}
      </div>

      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-navy-400">{hint}</p> : null}
    </div>
  );
}
