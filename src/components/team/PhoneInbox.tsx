"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/admin/CopyButton";
import { Icon } from "@/components/Icon";
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
 * The member's work number and the messages that arrived on it, newest
 * first. Checks for new ones every 20 seconds while open, and on the Refresh
 * button at once — someone waiting for a code should not have to reload the
 * page or wait for the next tick. Everything is marked read once shown, so
 * the red count on the tab goes when they have seen it.
 */
export function PhoneInbox({ phoneNumber, initial }: { phoneNumber?: string; initial: InboxMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set(initial.filter((m) => !m.readAt).map((m) => m.id)));
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState("");
  const known = useRef(new Set(initial.map((m) => m.id)));

  /** Fetch the inbox; returns how many messages are new, or null if it failed. */
  const load = useCallback(async (): Promise<number | null> => {
    try {
      const res = await fetch("/api/team/phone", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { messages: InboxMessage[] };
      const added = data.messages.filter((m) => !known.current.has(m.id));
      for (const m of data.messages) known.current.add(m.id);
      if (added.length) {
        setFresh((f) => new Set([...f, ...added.map((m) => m.id)]));
        void teamPost("/api/team/phone", { action: "read" }).catch(() => {});
      }
      setMessages(data.messages);
      return added.length;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (initial.some((m) => !m.readAt)) void teamPost("/api/team/phone", { action: "read" }).catch(() => {});
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [initial, load]);

  async function refresh() {
    setChecking(true);
    setStatus("");
    const added = await load();
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setStatus(
      added === null
        ? "Could not check — please try again."
        : added > 0
          ? `${added} new message${added === 1 ? "" : "s"}!`
          : `No new messages (checked at ${time}).`,
    );
    setChecking(false);
  }

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name="phone" className="h-6 w-6" />
        </span>
        {phoneNumber ? (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Your number</p>
              <p className="font-mono text-2xl font-bold text-navy-900" data-phone-number>
                {phoneNumber}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <CopyButton text={phoneNumber.replace(/[\s()-]/g, "")} label="Copy number" title="Copy your work number" />
              <button
                type="button"
                onClick={refresh}
                disabled={checking}
                data-refresh
                className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-navy-900 transition hover:bg-brand-100 disabled:opacity-70"
                title="Check for new messages"
              >
                <Icon name="rotate" className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking…" : "Refresh"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-navy-500">Your work number is being set up. It will appear here.</p>
        )}
        <p role="status" aria-live="polite" className="w-full text-sm text-navy-500 empty:hidden" data-refresh-status>
          {status}
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-extrabold text-navy-900">Messages</h2>
        {messages.length ? (
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
                    {fresh.has(m.id) ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span>
                    ) : null}
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
        ) : (
          <p className="rounded-xl bg-cream-100 p-4 text-sm text-navy-500">
            No messages yet. When one arrives on your number, press Refresh — or wait, it shows up here by itself within 20 seconds.
          </p>
        )}
        <p className="mt-4 text-xs text-navy-400">
          Messages are added by the WorkRoute team. Use a code only to sign in to your own work account, and never share it with anyone.
        </p>
      </section>
    </div>
  );
}
