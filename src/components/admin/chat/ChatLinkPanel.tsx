"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ChatMessages } from "@/components/admin/chat/ChatMessages";
import type { ChatMessage } from "@/lib/chat";

/**
 * The final-interview chat, in View info: send the link, see whether they
 * started, and read what was said.
 *
 * The transcript is fetched when the panel opens rather than carried in the
 * candidate list — a conversation can be long, and the list is loaded for
 * everybody on every page. It refreshes while it is on screen, so "Link sent —
 * not started" does not sit there after they have started.
 *
 * Only the latest request counts. Stepping to the next candidate while one is
 * loading must never let the slower answer land under the new name — that would
 * put one person's interview on another person's record.
 */

interface SessionInfo {
  id: string;
  status: "waiting" | "active" | "ended";
  linkSentAt: string;
  startedAt: string;
  joinedAt?: string;
  endedAt?: string;
  endedReason?: "replaced" | "ended";
  messages: ChatMessage[];
}

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<SessionInfo["status"], { text: string; tone: string }> = {
  waiting: { text: "Waiting for you", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  active: { text: "In progress", tone: "border-green-200 bg-green-50 text-green-800" },
  ended: { text: "Ended", tone: "border-navy-200 bg-navy-50 text-navy-600" },
};

export function ChatLinkPanel({
  candidate,
  onChange,
}: {
  candidate: { id: string; fullName: string; email?: string; chatLinkSentAt?: string; chatLinks?: string[] };
  onChange: (patch: { chatLinkSentAt?: string; chatLinks?: string[] }) => void;
}) {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [link, setLink] = useState<string | undefined>();
  const [expired, setExpired] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const links = candidate.chatLinks ?? (candidate.chatLinkSentAt ? [candidate.chatLinkSentAt] : []);
  const hasEmail = !!candidate.email?.includes("@");
  const seq = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await fetchWithTimeout(`/api/admin/candidates/${candidate.id}/chat`, { cache: "no-store" }, 12_000);
      const data = (await res.json()) as { ok?: boolean; sessions?: SessionInfo[]; link?: string; linkExpired?: boolean };
      if (mine !== seq.current) return; // overtaken — possibly by another candidate
      if (data.ok) {
        setSessions(data.sessions ?? []);
        setLink(data.link);
        setExpired(!!data.linkExpired);
      } else {
        setSessions((s) => s ?? []);
      }
    } catch {
      if (mine === seq.current) setSessions((s) => s ?? []);
    }
  }, [candidate.id]);

  useEffect(() => {
    setSessions(null);
    setLink(undefined);
    setExpired(false);
    setResult("");
    setShowAll(false);
    void load();
    // Refresh while the panel is actually showing — not while the Assessment
    // tab is hidden, and not while the browser tab is in the background.
    const timer = setInterval(() => {
      if (!document.hidden && rootRef.current?.offsetParent) void load();
    }, 15_000);
    return () => {
      clearInterval(timer);
      seq.current++; // anything still in flight is for a candidate no longer shown
    };
  }, [load]);

  const current = sessions?.find((s) => s.linkSentAt === candidate.chatLinkSentAt);
  const lastAt = links[links.length - 1];
  const recent = !!lastAt && Date.now() - Date.parse(lastAt) < 24 * 60 * 60 * 1000;

  async function send() {
    if (busy) return;
    setBusy(true);
    setResult("");
    try {
      const res = await adminPost(`/api/admin/candidates/${candidate.id}/chat`, {});
      const data = (await res.json()) as { ok?: boolean; error?: string; chatLinkSentAt?: string; chatLinks?: string[]; link?: string };
      if (data.ok) {
        setResult("sent");
        onChange({ chatLinkSentAt: data.chatLinkSentAt, chatLinks: data.chatLinks });
        setLink(data.link);
        setExpired(false);
        void load();
      } else {
        setResult(
          res.status === 401
            ? "your admin session has expired — sign in again"
            : data.error === "warmup_limit"
            ? "today's sending limit is reached"
            : data.error === "no_email"
              ? "no email address on file"
              : data.error ?? "failed",
        );
      }
    } catch {
      setResult("failed");
    }
    setBusy(false);
    setAsking(false);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard refused — the link is still visible to select */
    }
  }

  const shown = showAll ? sessions ?? [] : (sessions ?? []).slice(0, 1);

  return (
    <div ref={rootRef} className="mt-5 rounded-xl border border-navy-100 p-4" data-chat-panel>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Icon name="headset" className="h-4 w-4 text-navy-400" />
          Final interview chat
          {current ? (
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_LABEL[current.status].tone}`}>
              {STATUS_LABEL[current.status].text}
            </span>
          ) : links.length ? (
            <span className="rounded-full border border-navy-200 bg-navy-50 px-2 py-0.5 text-[10px] font-bold text-navy-600">
              {expired ? "Link expired" : "Link sent — not started"}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {current && current.status !== "ended" ? (
            <Link
              href={`/admin/chat?s=${current.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-navy-800"
            >
              <Icon name="chat" className="h-3.5 w-3.5" /> Open in Live chat
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setAsking(true)}
            disabled={!hasEmail || busy}
            title={hasEmail ? "Email them a final interview chat link" : "No email on file"}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-300 bg-brand-50 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition hover:bg-brand-100 disabled:opacity-50"
          >
            <Icon name="mail" className="h-3.5 w-3.5" />
            {links.length ? "Send a new chat link" : "Send final interview chat link"}
          </button>
        </div>
      </div>

      {links.length ? (
        <div className="mt-3 text-xs text-navy-600">
          <p className="font-semibold text-navy-500">Links sent</p>
          <ol className="mt-1 space-y-0.5">
            {links.map((at, i) => (
              <li key={at} className="flex gap-2">
                <span className="font-semibold text-navy-400">{i + 1}.</span>
                <span>
                  {fmt(at)}
                  {i === links.length - 1 ? (expired ? " — expired" : " — current") : " — replaced"}
                </span>
              </li>
            ))}
          </ol>
          {link ? (
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className="min-w-0 flex-1 truncate rounded-lg border border-navy-200 bg-navy-50 px-2 py-1 font-mono text-[11px] text-navy-600" aria-label="Current chat link" />
              <button type="button" onClick={() => void copy()} className="shrink-0 rounded-full border border-navy-200 px-3 py-1 text-[11px] font-bold text-navy-700 hover:bg-navy-50">
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-navy-500">
          No chat link sent yet. The candidate gets an email with a personal link, valid for 7 days.
          When they press Start chat you get a Telegram message and they appear in Live chat.
        </p>
      )}

      {result === "sent" ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700">
          <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0" /> Chat link emailed.
        </p>
      ) : result ? (
        <p className="mt-2 text-xs font-medium text-amber-700">Not sent ({result}).</p>
      ) : null}

      {sessions === null ? (
        <p className="mt-3 text-xs text-navy-400">Loading conversation…</p>
      ) : sessions.length ? (
        <div className="mt-3 border-t border-navy-100 pt-3">
          {shown.map((s) => (
            <div key={s.id} className="mb-3">
              <p className="text-xs font-semibold text-navy-500">
                Started {fmt(s.startedAt)}
                {s.endedAt ? ` · ended ${fmt(s.endedAt)}` : ""} · {s.messages.filter((m) => m.from !== "system").length} messages
              </p>
              <div className="mt-2 max-h-80 overflow-y-auto rounded-lg bg-cream-100/60 p-3" data-chat-transcript>
                <ChatMessages messages={s.messages} compact />
              </div>
            </div>
          ))}
          {sessions.length > 1 ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-brand-700 underline">
              {showAll ? "Show only the latest chat" : `Show all ${sessions.length} chats`}
            </button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={asking}
        icon="mail"
        title={links.length ? "Send a new chat link?" : "Send the final interview chat link?"}
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        warning={
          [
            current && current.status !== "ended"
              ? "They have a chat open right now. Sending a new link closes it, and they will need the new email to continue."
              : "",
            recent ? `A link already went out on ${fmt(lastAt)}.` : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onCancel={() => setAsking(false)}
        onConfirm={() => void send()}
        body={
          <>
            An email goes to <strong className="text-navy-900">{candidate.fullName || "this candidate"}</strong>
            {candidate.email ? (
              <>
                {" "}at <span className="font-medium text-navy-800">{candidate.email}</span>
              </>
            ) : null}
            , inviting them to their final interview as a live chat. The link is personal and valid
            for 7 days{links.length ? ", and any earlier link stops working" : ""}.
          </>
        }
      />
    </div>
  );
}
