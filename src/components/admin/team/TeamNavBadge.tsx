"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

/**
 * The count on the Team tickets and Hours & pay items: unread member
 * messages, and bank accounts, days off and missed check-ins to decide.
 * One poll a minute serves both, shared through a module-level promise.
 */
type Counts = { tickets: number; pay: number };
let inflight: Promise<Counts | null> | null = null;

function load(): Promise<Counts | null> {
  inflight ??= fetchWithTimeout("/api/admin/team/badges", { cache: "no-store" }, 12_000)
    .then(async (res) => (res.ok ? ((await res.json()) as Counts) : null))
    .catch(() => null)
    .finally(() => {
      setTimeout(() => (inflight = null), 1000);
    });
  return inflight;
}

export function TeamNavBadge({ kind }: { kind: "tickets" | "pay" }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const c = await load();
      if (!stop && c) setCount(c[kind]);
    };
    void tick();
    const t = setInterval(tick, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [kind]);
  if (!count) return null;
  return (
    <span
      data-team-badge={kind}
      aria-label={`${count} waiting`}
      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
