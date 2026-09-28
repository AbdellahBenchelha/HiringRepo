"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ChatMessages } from "@/components/admin/chat/ChatMessages";
import { MAX_MESSAGE, type ChatMessage } from "@/lib/chat";
import { newId } from "@/lib/id";
import type { ChatSummary } from "@/app/api/admin/chats/route";

/**
 * The Live chat tab: every conversation on the left, the open one on the right.
 *
 * Built for several at once. Each conversation keeps its own draft, the list
 * shows who is waiting and who has written, and switching loses nothing —
 * the server holds the conversation, this only shows it.
 */

interface SessionView {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidateCountry?: string;
  candidatePosition?: string;
  status: "waiting" | "active" | "ended";
  startedAt: string;
  joinedAt?: string;
  endedAt?: string;
  endedReason?: "replaced" | "ended";
  messages: ChatMessage[];
  total: number;
  candidateOnline: boolean;
  candidateSeenAt?: string;
  candidateTyping: boolean;
}

type Pending = { clientId: string; text: string; failed?: string };

const LIST_MS = 3000;
const OPEN_MS = 2000;

function ago(iso: string | undefined, now: number) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
    setTimeout(() => void ctx.close().catch(() => {}), 700);
  } catch {
    /* sound is a nicety */
  }
}

export function LiveChatInbox({ questions, initialId }: { questions: string[]; initialId?: string }) {
  const [list, setList] = useState<ChatSummary[] | null>(null);
  const [listError, setListError] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(initialId);
  const [open, setOpen] = useState<SessionView | null>(null);
  const [pending, setPending] = useState<Record<string, Pending[]>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);

  const openRef = useRef<SessionView | null>(null);
  const seenWaiting = useRef<Set<string> | null>(null);
  const lastUnread = useRef<number | null>(null);
  const listEl = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastTyping = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const soundRef = useRef(true);
  soundRef.current = sound;
  openRef.current = open;

  /* -- the list ----------------------------------------------------------- */
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/chats", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; sessions?: ChatSummary[]; counts?: { waiting: number; unread: number } };
        if (data.ok && data.sessions) {
          setList(data.sessions);
          setListError(false);
          // A new person waiting, or more unread than last time, is worth a sound.
          const waitingIds = new Set(data.sessions.filter((s) => s.status === "waiting").map((s) => s.id));
          const unread = data.counts?.unread ?? 0;
          if (seenWaiting.current) {
            const fresh = [...waitingIds].some((id) => !seenWaiting.current!.has(id));
            if ((fresh || (lastUnread.current !== null && unread > lastUnread.current)) && soundRef.current) beep();
          }
          seenWaiting.current = waitingIds;
          lastUnread.current = unread;
          const n = (data.counts?.waiting ?? 0) + unread;
          document.title = n ? `(${n}) Live chat` : "Live chat";
        } else {
          setListError(true);
        }
      } catch {
        setListError(true);
      }
      if (!stop) timer = setTimeout(poll, document.hidden ? LIST_MS * 3 : LIST_MS);
    };
    void poll();
    const tick = setInterval(() => setNow(Date.now()), 20_000);
    return () => {
      stop = true;
      clearTimeout(timer);
      clearInterval(tick);
    };
  }, []);

  // Nothing chosen yet: open whoever has waited longest, else the latest active.
  useEffect(() => {
    if (selected || !list?.length) return;
    const first = list.find((s) => s.status === "waiting") ?? list.find((s) => s.status === "active");
    if (first) setSelected(first.id);
  }, [list, selected]);

  /* -- the open conversation ---------------------------------------------- */
  const applySession = useCallback((s: SessionView) => {
    setOpen((prev) => {
      if (!prev || prev.id !== s.id) return s;
      const start = s.total - s.messages.length;
      return { ...s, messages: prev.messages.slice(0, Math.max(0, start)).concat(s.messages) };
    });
    setPending((p) => {
      const mine = p[s.id];
      if (!mine?.length) return p;
      return { ...p, [s.id]: mine.filter((x) => !s.messages.some((m) => m.clientId === x.clientId)) };
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    setOpen((o) => (o && o.id === selected ? o : null));
    atBottom.current = true;
    const poll = async () => {
      const cur = openRef.current;
      const from = cur && cur.id === selected ? cur.messages.length : 0;
      try {
        const res = await fetch(`/api/admin/chats/${selected}?from=${from}`, { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; session?: SessionView };
        if (!stop && data.ok && data.session) applySession(data.session);
        if (!stop && res.status === 404) {
          setSelected(undefined);
          return;
        }
      } catch {
        /* next poll */
      }
      if (!stop) timer = setTimeout(poll, document.hidden ? OPEN_MS * 4 : OPEN_MS);
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [selected, applySession]);

  // Seen what is on screen: tell the server, so the unread badge clears.
  const summary = list?.find((s) => s.id === selected);
  useEffect(() => {
    if (!open || !summary?.unread || document.hidden) return;
    void adminPost(`/api/admin/chats/${open.id}`, { action: "read", count: open.messages.length }).catch(() => {});
  }, [open?.id, open?.messages.length, summary?.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -- scrolling ---------------------------------------------------------- */
  const myPending = (open && pending[open.id]) || [];
  useLayoutEffect(() => {
    const el = listEl.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [open?.id, open?.messages.length, myPending.length, open?.candidateTyping]);

  /* -- actions ------------------------------------------------------------ */
  async function act(action: "join" | "end") {
    if (!open || busy) return;
    setBusy(action);
    setActionError("");
    try {
      const res = await adminPost(`/api/admin/chats/${open.id}`, { action, from: open.messages.length });
      const data = (await res.json()) as { ok?: boolean; session?: SessionView; error?: string };
      if (data.ok && data.session) applySession(data.session);
      else setActionError(data.error === "ended" ? "This chat has already ended." : "That did not go through. Try again.");
    } catch {
      setActionError("Could not reach the server.");
    }
    setBusy("");
    setConfirmEnd(false);
    if (action === "join") setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function deliver(sessionId: string, p: Pending) {
    setPending((all) => ({
      ...all,
      [sessionId]: (all[sessionId] ?? []).map((x) => (x.clientId === p.clientId ? { ...x, failed: undefined } : x)),
    }));
    const fail = (why: string) =>
      setPending((all) => ({
        ...all,
        [sessionId]: (all[sessionId] ?? []).map((x) => (x.clientId === p.clientId ? { ...x, failed: why } : x)),
      }));
    try {
      const cur = openRef.current;
      const res = await adminPost(`/api/admin/chats/${sessionId}`, {
        action: "send",
        text: p.text,
        clientId: p.clientId,
        from: cur && cur.id === sessionId ? cur.messages.length : 0,
      });
      const data = (await res.json()) as { ok?: boolean; session?: SessionView; error?: string };
      if (data.ok && data.session) {
        if (openRef.current?.id === sessionId) applySession(data.session);
        else setPending((all) => ({ ...all, [sessionId]: (all[sessionId] ?? []).filter((x) => x.clientId !== p.clientId) }));
      } else {
        fail(data.error === "ended" ? "The chat has ended." : data.error === "too_long" ? "Too long." : "Not sent.");
      }
    } catch {
      fail("Not sent — connection problem.");
    }
  }

  function send() {
    if (!open || open.status === "ended") return;
    const text = (drafts[open.id] ?? "").trim();
    if (!text || text.length > MAX_MESSAGE) return;
    const p: Pending = { clientId: newId(12), text };
    setPending((all) => ({ ...all, [open.id]: [...(all[open.id] ?? []), p] }));
    setDrafts((d) => ({ ...d, [open.id]: "" }));
    atBottom.current = true;
    lastTyping.current = 0;
    void deliver(open.id, p);
  }

  function onDraft(value: string) {
    if (!open) return;
    setDrafts((d) => ({ ...d, [open.id]: value }));
    const t = Date.now();
    if (value.trim() && open.status !== "ended" && t - lastTyping.current > 3000) {
      lastTyping.current = t;
      void adminPost(`/api/admin/chats/${open.id}`, { action: "typing", typing: true }).catch(() => {});
    }
  }

  function insertQuestion(q: string) {
    if (!open) return;
    const cur = drafts[open.id] ?? "";
    onDraft(cur.trim() ? `${cur.trimEnd()}\n${q}` : q);
    setShowQuestions(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  const draft = open ? drafts[open.id] ?? "" : "";
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft, open?.id]);

  const asked = useMemo(() => {
    const said = new Set((open?.messages ?? []).filter((m) => m.from === "recruiter").map((m) => m.text.trim()));
    return (q: string) => said.has(q.trim());
  }, [open?.messages]);

  const groups = useMemo(() => {
    const l = list ?? [];
    return [
      { key: "waiting", title: "Waiting", items: l.filter((s) => s.status === "waiting") },
      { key: "active", title: "Active", items: l.filter((s) => s.status === "active") },
      { key: "ended", title: "Ended", items: l.filter((s) => s.status === "ended") },
    ];
  }, [list]);

  const view = open && open.id === selected ? open : null;

  /* -- render ------------------------------------------------------------- */
  return (
    <div className="grid h-[calc(100dvh-10rem)] min-h-[520px] overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft md:grid-cols-[320px_1fr]">
      {/* ---- conversations ---- */}
      <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-navy-100 bg-navy-50/40`}>
        <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
          <p className="text-sm font-bold text-navy-900">Conversations</p>
          <button
            type="button"
            onClick={() => setSound((v) => !v)}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-navy-500 hover:bg-navy-100"
            title="Play a sound when somebody starts a chat or writes"
          >
            Sound {sound ? "on" : "off"}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-chat-list>
          {list === null ? (
            <p className="p-4 text-sm text-navy-500">{listError ? "Could not load chats — retrying…" : "Loading…"}</p>
          ) : list.length === 0 ? (
            <div className="p-6 text-center">
              <Icon name="headset" className="mx-auto h-8 w-8 text-navy-300" />
              <p className="mt-2 text-sm font-semibold text-navy-700">No chats yet</p>
              <p className="mt-1 text-xs text-navy-500">
                Send a final interview chat link from a candidate&rsquo;s View info. When they press
                Start chat, they appear here and you get a Telegram message.
              </p>
            </div>
          ) : (
            groups.map((g) =>
              g.items.length ? (
                <div key={g.key}>
                  <p className="sticky top-0 z-[1] bg-navy-50/95 px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-navy-500 backdrop-blur">
                    {g.title} · {g.items.length}
                  </p>
                  {g.items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      data-chat-item={s.candidateName}
                      onClick={() => {
                        setSelected(s.id);
                        setShowQuestions(false);
                        setActionError("");
                      }}
                      className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition ${
                        s.id === selected
                          ? "border-brand-500 bg-white"
                          : s.status === "waiting"
                            ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50"
                            : "border-transparent hover:bg-white"
                      }`}
                    >
                      <span className="relative shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                          {initials(s.candidateName)}
                        </span>
                        {s.status !== "ended" ? (
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                              s.candidateOnline ? "bg-green-500" : "bg-navy-300"
                            }`}
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-navy-900">{s.candidateName}</span>
                          <span className="shrink-0 text-[10px] font-medium text-navy-400">
                            {s.status === "waiting" ? `waiting ${ago(s.startedAt, now)}` : ago(s.lastMessageAt, now)}
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-navy-500">
                          {[s.candidateCountry, s.candidatePosition].filter(Boolean).join(" · ")}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={`truncate text-xs ${s.unread ? "font-semibold text-navy-800" : "text-navy-500"}`}>
                            {s.candidateTyping
                              ? "typing…"
                              : s.preview
                                ? `${s.preview.from === "recruiter" ? "You: " : ""}${s.preview.text}`
                                : s.status === "waiting"
                                  ? "Waiting for you to join"
                                  : ""}
                          </span>
                          {s.unread ? (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                              {s.unread}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null,
            )
          )}
        </div>
      </aside>

      {/* ---- the conversation ---- */}
      <section className={`${selected ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Icon name="chat" className="h-8 w-8" />
            </span>
            <p className="mt-3 text-base font-bold text-navy-900">Select a conversation</p>
            <p className="mt-1 max-w-sm text-sm text-navy-500">
              You can hold several chats at once — switch between them on the left. Nothing is lost
              when you switch.
            </p>
          </div>
        ) : !view ? (
          <p className="p-6 text-sm text-navy-500">Loading conversation…</p>
        ) : (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(undefined)}
                  className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-100 md:hidden"
                  aria-label="Back to conversations"
                >
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                  {initials(view.candidateName)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-navy-900" data-chat-title>
                    {view.candidateName}
                  </p>
                  <p className="truncate text-xs text-navy-500">
                    {view.status === "ended" ? (
                      <>Ended {ago(view.endedAt, now)} ago</>
                    ) : view.candidateTyping ? (
                      <span className="font-semibold text-brand-700">typing…</span>
                    ) : view.candidateOnline ? (
                      <span className="font-semibold text-green-700">● On the chat page</span>
                    ) : (
                      <>Not on the page{view.candidateSeenAt ? ` · last seen ${ago(view.candidateSeenAt, now)} ago` : ""}</>
                    )}
                    {[view.candidateCountry, view.candidatePosition, view.candidateEmail].filter(Boolean).length
                      ? ` · ${[view.candidateCountry, view.candidatePosition, view.candidateEmail].filter(Boolean).join(" · ")}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {view.status === "waiting" ? (
                  <button
                    type="button"
                    onClick={() => void act("join")}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <Icon name="chat" className="h-3.5 w-3.5" />
                    {busy === "join" ? "Joining…" : "Join chat"}
                  </button>
                ) : null}
                {view.status !== "ended" ? (
                  <button
                    type="button"
                    onClick={() => setConfirmEnd(true)}
                    disabled={!!busy}
                    className="rounded-full border border-navy-200 px-4 py-2 text-xs font-bold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
                  >
                    End chat
                  </button>
                ) : (
                  <span className="rounded-full bg-navy-100 px-3 py-1 text-[11px] font-bold text-navy-600">
                    {view.endedReason === "replaced" ? "Closed — new link sent" : "Ended"}
                  </span>
                )}
              </div>
            </header>

            {actionError ? (
              <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">{actionError}</p>
            ) : null}

            <div
              ref={listEl}
              onScroll={() => {
                const el = listEl.current;
                if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="min-h-0 flex-1 overflow-y-auto bg-cream-100/60 px-4 py-3"
              data-chat-messages
            >
              <ChatMessages messages={view.messages} />
              {myPending.map((p) => (
                <div key={p.clientId} className="mt-2.5 flex justify-end">
                  <div className="flex max-w-[75%] flex-col items-end">
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed ${
                        p.failed ? "border border-red-200 bg-red-50 text-red-900" : "bg-navy-900/60 text-white"
                      }`}
                    >
                      {p.text}
                    </div>
                    {p.failed ? (
                      <span className="mt-0.5 flex gap-2 text-[11px] font-semibold text-red-700">
                        {p.failed}
                        {view.status !== "ended" ? (
                          <button type="button" className="underline" onClick={() => void deliver(view.id, p)}>
                            Try again
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span className="mt-0.5 text-[10px] text-navy-400">Sending…</span>
                    )}
                  </div>
                </div>
              ))}
              {view.candidateTyping ? (
                <div className="mt-2.5 flex">
                  <div className="rounded-2xl rounded-bl-md border border-navy-100 bg-white px-3.5 py-2.5 shadow-sm">
                    <span className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-navy-300" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {view.status === "ended" ? (
              <div className="border-t border-navy-100 bg-white px-4 py-3 text-xs text-navy-500">
                This chat has ended and cannot be reopened. To talk again, send a new chat link from
                their View info.
              </div>
            ) : (
              <div className="border-t border-navy-100 bg-white">
                {showQuestions ? (
                  <div className="max-h-56 overflow-y-auto border-b border-navy-100 bg-navy-50/50 p-2" data-saved-questions>
                    {questions.length === 0 ? (
                      <p className="p-2 text-xs text-navy-500">
                        No saved questions. Add some in{" "}
                        <Link href="/admin/settings/chat" className="font-semibold text-brand-700 underline">
                          Settings → Live chat
                        </Link>
                        .
                      </p>
                    ) : (
                      questions.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => insertQuestion(q)}
                          className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-navy-700 transition hover:bg-white"
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${asked(q) ? "bg-green-600 text-white" : "bg-navy-200 text-navy-600"}`}>
                            {asked(q) ? <Icon name="check" className="h-2.5 w-2.5" /> : i + 1}
                          </span>
                          <span className={asked(q) ? "text-navy-400" : ""}>{q}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
                <form
                  className="flex items-end gap-2 p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowQuestions((v) => !v)}
                    className={`flex h-10 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-bold transition ${
                      showQuestions ? "border-brand-400 bg-brand-50 text-brand-800" : "border-navy-200 text-navy-600 hover:bg-navy-50"
                    }`}
                    title="Saved questions"
                  >
                    <Icon name="document" className="h-3.5 w-3.5" /> Questions
                  </button>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => onDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={view.status === "waiting" ? "Type to join and reply…" : "Type a message — Enter to send, Shift+Enter for a new line"}
                    aria-label="Message"
                    className="max-h-44 min-h-[40px] flex-1 resize-none rounded-2xl border-2 border-navy-100 bg-cream-50 px-3.5 py-2 text-sm leading-relaxed text-navy-900 focus:border-brand-400 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || draft.length > MAX_MESSAGE}
                    aria-label="Send"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-navy-900 transition hover:bg-brand-400 disabled:opacity-40"
                  >
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </form>
                {draft.length > MAX_MESSAGE - 300 ? (
                  <p className={`-mt-2 px-4 pb-2 text-right text-[11px] ${draft.length > MAX_MESSAGE ? "font-bold text-red-700" : "text-navy-400"}`}>
                    {draft.length} / {MAX_MESSAGE}
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmEnd}
        icon="close"
        title="End this chat?"
        confirmLabel={busy === "end" ? "Ending…" : "End chat"}
        busy={busy === "end"}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => void act("end")}
        body={
          <>
            {view?.candidateName || "The candidate"} will see that the chat has ended and will not be
            able to write again. The conversation is kept on their record. To talk again later you
            would send a new chat link.
          </>
        }
      />
    </div>
  );
}
