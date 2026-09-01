"use client";

import { Icon } from "@/components/Icon";

/**
 * Page controls shared by the Candidates and Interviews tables.
 *
 * Paging happens after filtering and sorting, never before: the filters have
 * to see every candidate or they answer the wrong question — "no Nigerians
 * awaiting review" would really mean "none on this page", which is worse than
 * no filter at all.
 */

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Which page numbers to draw.
 *
 * Every page up to seven, then first and last with a window around the current
 * one and gaps between. A row of ninety numbers is not navigation.
 */
export function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("gap");
  for (let i = start; i <= end; i += 1) items.push(i);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  /** How many rows survived the filters, not how many exist. */
  total: number;
  pageSize: number;
  /** Singular name of a row, for the count line. */
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-navy-500">
        {total === 0 ? (
          <>No {noun}s to show</>
        ) : (
          <>
            Showing <span className="font-semibold text-navy-900">{first}–{last}</span> of {total}{" "}
            {noun}
            {total === 1 ? "" : "s"}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-navy-500">
          Rows
          <select
            className="select !w-auto !py-1.5 text-xs"
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* One page is no navigation — the row count above already says it. */}
        {pageCount > 1 ? (
          <nav aria-label="Pagination" className="flex items-center gap-1">
            <Step label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
              <Icon name="chevronLeft" className="h-4 w-4" />
            </Step>

            {pageItems(page, pageCount).map((item, i) =>
              item === "gap" ? (
                <span key={`gap-${i}`} className="px-1.5 text-sm text-navy-400" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === page ? "page" : undefined}
                  className={`min-w-[2rem] rounded-lg px-2 py-1.5 text-sm font-semibold transition ${
                    item === page
                      ? "bg-navy-900 text-white"
                      : "text-navy-600 hover:bg-navy-100"
                  }`}
                >
                  {item}
                </button>
              ),
            )}

            <Step label="Next page" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
              <Icon name="chevronRight" className="h-4 w-4" />
            </Step>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-lg p-1.5 text-navy-600 transition hover:bg-navy-100 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
