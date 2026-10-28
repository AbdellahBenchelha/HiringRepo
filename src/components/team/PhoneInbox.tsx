"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/admin/CopyButton";
import { findCode, formatDateTime } from "@/lib/teamShared";
import { teamPost } from "@/lib/teamClient";

export interface InboxMessage {
  id: string;
  number: string;
  sender: string;
  body: string;
  at: string;
  readAt?: string;
}

/**
 * The messages on the member's work number, newest first. Checks for new
 * ones every 20 seconds while open, and marks everything read once shown —
 * so the red count on the tab goes when they have seen it.
 */
export function PhoneInbox({ initial }: { initial: InboxMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set(initial.filter((m) => !m.readAt).map((m) => m.id)));

  useEffect(() => {
    if (initial.some((m) => !m.readAt)) void teamPost("/api/team/phone", { action: "read" }).catch(() => {});
    let stop = false;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/team/phone", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: InboxMessage[] };
        if (stop) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const added = data.messages.filter((m) => !known.has(m.id));
          if (added.length) {
            setFresh((f) => new Set([...f, ...added.map((m) => m.id)]));
            void teamPost("/api/team/phone", { action: "read" }).catch(() => {});
          }
          return data.messages;
        });
      } catch {
        /* try again on the next tick */
      }
    }, 20_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [initial]);

  if (!messages.length) {
    return (
      <p className="rounded-xl bg-cream-100 p-4 text-sm text-navy-500">
        No messages yet. When one arrives on your number, it shows here within a few seconds of us adding it, and you get an email.
      </p>
    );
  }

  return (
    <ul className="space-y-3" data-phone-inbox>
      {messages.map((m) => {
        const code = findCode(m.body);
        return (
          <li
            key={m.id}
            data-message
            className={`rounded-2xl border bg-white p-4 ${fresh.has(m.id) ? "border-brand-300 shadow-soft" : "border-cream-300"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-navy-900">{m.sender}</p>
              {fresh.has(m.id) ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span> : null}
              <p className="ml-auto text-xs text-navy-400">{formatDateTime(m.at)}</p>
            </div>
            <p className="mt-1 whitespace-pre-line break-words text-[15px] text-navy-800">{m.body}</p>
            {code ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="rounded-lg bg-cream-200 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-navy-900" data-code>
                  {code}
                </span>
                <CopyButton text={code} label="Copy code" copiedLabel="Code copied" title="Copy the code" />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
