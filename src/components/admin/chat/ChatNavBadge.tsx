"use client";

import { useEffect, useState } from "react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

/**
 * The count on the Live chat item in the sidebar: the conversations that need
 * you — somebody waiting, or somebody who has written and not been read. People,
 * not messages. Shown on every admin page, so a chat started while you are
 * working in Candidates is not missed.
 */
export function ChatNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetchWithTimeout("/api/admin/chats", { cache: "no-store" }, 12_000);
        if (res.status === 401) return; // signed out: the page itself will say so
        const data = (await res.json()) as { ok?: boolean; counts?: { attention: number } };
        if (data.ok && data.counts) setCount(data.counts.attention);
      } catch {
        /* the next poll will do */
      }
      if (!stop) timer = setTimeout(poll, document.hidden ? 30000 : 12000);
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, []);

  if (!count) return null;
  return (
    <span
      data-chat-badge
      aria-label={`${count} ${count === 1 ? "chat needs" : "chats need"} you`}
      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
