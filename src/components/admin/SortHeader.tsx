"use client";

/**
 * A column header that sorts its table.
 *
 * Generic over the key type so each table keeps its own closed set of sortable
 * columns — the compiler still refuses a header naming a column that table
 * cannot sort by. Shared rather than written twice so the two tables cannot
 * drift into looking or behaving differently, which is exactly what happened
 * before: one had sorting and the other had none at all, and the one with none
 * was the one where a candidate who had just finished their assessment could
 * not be found without searching for them by name.
 */
export function SortHeader<K extends string>({
  label,
  k,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  k: K;
  sort: { key: K; dir: "asc" | "desc" };
  onSort: (k: K) => void;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <th className={`px-4 py-3 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onSort(k)}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-navy-900 ${
          active ? "text-navy-900" : ""
        }`}
      >
        {label}
        <span aria-hidden="true" className={active ? "text-brand-600" : "text-navy-300"}>
          {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
