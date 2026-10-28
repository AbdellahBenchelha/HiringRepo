"use client";

import { useMemo, useState } from "react";

/**
 * Pick the members a ticket goes to: search, tick, or tick everyone shown.
 * Hands the chosen ids to its child form.
 */
export function MemberPicker({
  members,
  children,
}: {
  members: { id: string; fullName: string; loginEmail: string }[];
  children: (ids: string[]) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? members.filter((m) => `${m.fullName} ${m.loginEmail}`.toLowerCase().includes(n)) : members;
  }, [q, members]);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-navy-900">Send to ({chosen.length} chosen)</p>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search members" className="input w-56 py-1.5 text-sm" />
          <button type="button" onClick={() => setChosen([...new Set([...chosen, ...shown.map((m) => m.id)])])} className="text-xs font-semibold text-navy-600 hover:underline">
            Tick all shown
          </button>
          <button type="button" onClick={() => setChosen([])} className="text-xs font-semibold text-navy-600 hover:underline">
            Clear
          </button>
        </div>
        <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-cream-300 bg-white p-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-cream-100">
              <input
                type="checkbox"
                data-pick={m.id}
                checked={chosen.includes(m.id)}
                onChange={(e) => setChosen(e.target.checked ? [...chosen, m.id] : chosen.filter((x) => x !== m.id))}
              />
              <span className="truncate">{m.fullName}</span>
            </label>
          ))}
          {!shown.length ? <p className="p-2 text-sm text-navy-400">Nobody matches.</p> : null}
        </div>
      </div>
      {children(chosen)}
    </div>
  );
}
