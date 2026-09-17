import { AdminShell } from "@/components/admin/AdminShell";

/**
 * What a tab shows while its rows are being fetched.
 *
 * These pages are rendered on the server, so between pressing a tab and the
 * answer arriving there was nothing at all: the previous tab stayed on screen,
 * unchanged, and the only evidence the press had registered was that it
 * eventually changed. Over a fast connection that reads as a lag; over a slow
 * one it reads as a button that does not work, and gets pressed again.
 *
 * So the shape arrives immediately and the content fills in. It is deliberately
 * a shape rather than a spinner — the heading is real, the layout is the
 * layout, and only the rows are pending, which tells somebody they are in the
 * right place while they wait.
 */
/**
 * The dashboard's own shape, which is tiles and charts rather than rows.
 *
 * Kept beside the table one because they exist for the same reason and should
 * change together — a skeleton that stops matching the page it stands in for
 * is worse than none, since it promises a layout that never arrives.
 */
export function DashboardSkeleton() {
  return (
    <AdminShell>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Dashboard</h1>
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-navy-100" />
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-navy-100 bg-white p-5">
            <div className="h-3 w-24 animate-pulse rounded bg-navy-100" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-navy-100" />
            <div className="mt-3 h-8 w-full animate-pulse rounded bg-navy-50" />
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-5 lg:col-span-2">
          <div className="h-3 w-32 animate-pulse rounded bg-navy-100" />
          <div className="mt-4 h-56 w-full animate-pulse rounded-xl bg-navy-50" />
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-5">
          <div className="h-3 w-28 animate-pulse rounded bg-navy-100" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-navy-50" />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5">
        <div className="h-3 w-24 animate-pulse rounded bg-navy-100" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-navy-50" />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

export function TableSkeleton({
  title,
  rows = 8,
}: {
  title: string;
  /** Roughly a screenful. Fewer looks broken, more scrolls for no reason. */
  rows?: number;
}) {
  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h1>
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-navy-100" />
      </header>

      {/* The filter card, which is on every one of these tabs. */}
      <div className="mb-5 rounded-2xl border border-navy-100 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-20 animate-pulse rounded bg-navy-100" />
              <div className="mt-2 h-10 w-full animate-pulse rounded-xl bg-navy-50" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-28 animate-pulse rounded bg-navy-100" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-navy-100" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
        <div className="border-b border-navy-100 bg-navy-50/60 px-4 py-3">
          <div className="h-3 w-40 animate-pulse rounded bg-navy-200" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-navy-50 px-4 py-4 last:border-b-0"
            // Staggered so it reads as a list filling in rather than one block
            // flashing, which is easier to look at for the second or two it is
            // on screen.
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-navy-100" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-44 max-w-full animate-pulse rounded bg-navy-100" />
              <div className="mt-2 h-3 w-32 max-w-full animate-pulse rounded bg-navy-50" />
            </div>
            <div className="hidden h-3 w-24 animate-pulse rounded bg-navy-100 sm:block" />
            <div className="hidden h-3 w-20 animate-pulse rounded bg-navy-100 md:block" />
            <div className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-navy-100" />
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
