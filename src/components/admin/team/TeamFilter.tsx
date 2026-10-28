"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Search and status filter for the Team tab, kept in the address bar. */
export function TeamFilter({
  q,
  status,
  counts,
}: {
  q: string;
  status: string;
  counts: Record<"all" | "active" | "paused" | "left", number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);

  function go(next: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const nq = next.q ?? text;
    const ns = next.status ?? status;
    if (nq.trim()) params.set("q", nq.trim());
    if (ns !== "active") params.set("status", ns);
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go({});
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search name, email, phone…"
          aria-label="Search the team"
          className="input w-64 py-2 text-sm"
        />
        <button className="btn-secondary py-2">Search</button>
      </form>
      <div className="flex gap-1">
        {(["active", "paused", "left", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => go({ status: s })}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              status === s ? "bg-navy-900 text-white" : "bg-white text-navy-600 hover:bg-navy-50"
            }`}
          >
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)} ({counts[s]})
          </button>
        ))}
      </div>
    </div>
  );
}
