"use client";

import { useEffect, useState } from "react";

/**
 * The count on the Live chat item in the sidebar: candidates waiting plus
 * messages not yet read. Shown on every admin page, so a chat started while
 * you are working in Candidates is not missed.
 */
export function ChatNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/chats", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; counts?: { waiting: number; unread: number } };
        if (data.ok && data.counts) setCount(data.counts.waiting + data.counts.unread);
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
      aria-label={`${count} waiting or unread`}
      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
