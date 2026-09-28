"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import {
  BUSY_AFTER_MINUTES,
  MAX_MESSAGE,
  RECRUITER_NAME,
  splitLinks,
  type CandidateChatState,
  type PublicMessage,
} from "@/lib/chat";
import { newId } from "@/lib/id";

/**
 * The candidate's side of the final-interview chat.
 *
 * Polls rather than holding a socket open: it works through every proxy and
 * mobile network, survives the phone locking, and a message a couple of
 * seconds late is nothing in an interview. Every failure has a visible state —
 * a dropped connection says it is reconnecting, a message that did not go says
 * so and offers to try again, and a link that stopped working says why.
 */

type Pending = { clientId: string; text: string; at: string; failed?: string };
type Blocked = "replaced" | "expired" | "invalid" | "not_found" | null;

const POLL_VISIBLE_MS = 2500;
const POLL_HIDDEN_MS = 8000;

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Recruiter text, with its links clickable. Never HTML — React nodes only. */
function Linked({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) =>
        p.kind === "link" ? (
          <a
            key={i}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
          >
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function Avatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-extrabold tracking-tight text-brand-400">
      WR
    </span>
  );
}

/** A short, soft two-note chime for a new recruiter message while the tab is hidden. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.14 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.14);
      o.stop(ctx.currentTime + i * 0.14 + 0.3);
    });
    setTimeout(() => void ctx.close().catch(() => {}), 800);
  } catch {
    /* sound is a nicety */
  }
}

export function ChatRoom({
  token,
  firstName,
  position,
  hours,
  initial,
}: {
  token: string;
  firstName: string;
  position?: string;
  hours: string;
  initial: CandidateChatState;
}) {
  const [status, setStatus] = useState<CandidateChatState["status"]>(initial.status);
  const [messages, setMessages] = useState<PublicMessage[]>(initial.messages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [startedAt, setStartedAt] = useState(initial.startedAt);
  const [endedReason, setEndedReason] = useState(initial.endedReason);
  const [recruiterTyping, setRecruiterTyping] = useState(initial.recruiterTyping);
  const [draft, setDraft] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [offline, setOffline] = useState(false);
  const [blocked, setBlocked] = useState<Blocked>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showJump, setShowJump] = useState(false);

  const countRef = useRef(initial.total);
  const known = useRef(new Set(initial.messages.map((m) => m.id)));
  const failures = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastTypingSent = useRef(0);
  const unseen = useRef(0);
  const baseTitle = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Fold a server state into what is on screen. Idempotent, so racing replies are harmless. */
  const apply = useCallback((state: CandidateChatState) => {
    const start = state.total - state.messages.length;
    const fresh = state.messages.filter((m) => m.from === "recruiter" && !known.current.has(m.id));
    state.messages.forEach((m) => known.current.add(m.id));
    setMessages((prev) => prev.slice(0, Math.max(0, start)).concat(state.messages));
    countRef.current = state.total;
    setPending((p) => p.filter((x) => !state.messages.some((m) => m.clientId === x.clientId)));
    setStatus(state.status);
    setStartedAt(state.startedAt);
    setEndedReason(state.endedReason);
    setRecruiterTyping(state.recruiterTyping);
    // Tell somebody who has switched tabs that the recruiter has written.
    if (fresh.length && typeof document !== "undefined" && document.hidden) {
      unseen.current += fresh.length;
      document.title = `(${unseen.current}) New message — WorkRoute`;
      chime();
    }
  }, []);

  const handleRefusal = useCallback((res: Response, data: { error?: string }) => {
    if (res.status === 409 && data.error === "replaced") setBlocked("replaced");
    else if (res.status === 403) setBlocked(data.error === "expired" ? "expired" : "invalid");
    else if (res.status === 404 && data.error === "not_found") setBlocked("not_found");
    else return false;
    return true;
  }, []);

  /* -- polling ------------------------------------------------------------ */
  useEffect(() => {
    if (status === "not_started" || blocked) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/chat?t=${encodeURIComponent(token)}&from=${countRef.current}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; state?: CandidateChatState; error?: string };
        if (data.ok && data.state) {
          failures.current = 0;
          setOffline(false);
          apply(data.state);
        } else if (!handleRefusal(res, data)) {
          failures.current += 1;
        }
      } catch {
        failures.current += 1;
      }
      if (failures.current >= 2) setOffline(true);
      if (stop) return;
      const hidden = typeof document !== "undefined" && document.hidden;
      // Back off gently while the connection is down, to a ceiling.
      const base = hidden ? POLL_HIDDEN_MS : POLL_VISIBLE_MS;
      timer = setTimeout(poll, Math.min(base * Math.max(1, failures.current), 15000));
    };
    timer = setTimeout(poll, status === "ended" ? 5000 : 800);
    const onVisible = () => {
      if (!document.hidden) {
        unseen.current = 0;
        if (baseTitle.current) document.title = baseTitle.current;
        clearTimeout(timer);
        timer = setTimeout(poll, 100);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // An ended chat still polls, slowly, in case a page was left open — but it
    // is the status change that matters, so the effect restarts on it.
  }, [status === "not_started", status === "ended", blocked, token, apply, handleRefusal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    baseTitle.current = document.title;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* -- scrolling ---------------------------------------------------------- */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (atBottom.current) el.scrollTop = el.scrollHeight;
    else setShowJump(true);
  }, [messages.length, pending.length, recruiterTyping, status]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current) setShowJump(false);
  };
  const jump = () => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    atBottom.current = true;
    setShowJump(false);
  };

  /* -- actions ------------------------------------------------------------ */
  async function start() {
    if (starting) return;
    setStarting(true);
    setStartError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, action: "start", from: 0 }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; state?: CandidateChatState; error?: string };
      if (data.ok && data.state) {
        apply(data.state);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (!handleRefusal(res, data)) {
        setStartError(
          res.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : "We could not start the chat. Please check your connection and try again.",
        );
      }
    } catch {
      setStartError("We could not reach the server. Please check your connection and try again.");
    }
    setStarting(false);
  }

  async function deliver(p: Pending) {
    setPending((list) => list.map((x) => (x.clientId === p.clientId ? { ...x, failed: undefined } : x)));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, action: "send", text: p.text, clientId: p.clientId, from: countRef.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; state?: CandidateChatState; error?: string };
      if (data.ok && data.state) {
        setOffline(false);
        apply(data.state);
        return;
      }
      if (handleRefusal(res, data)) return;
      const why =
        data.error === "ended"
          ? "The chat has ended."
          : res.status === 429
            ? "You are sending messages too quickly. Wait a moment and try again."
            : data.error === "too_long"
              ? "That message is too long."
              : "Not sent.";
      if (data.error === "ended") setStatus("ended");
      setPending((list) => list.map((x) => (x.clientId === p.clientId ? { ...x, failed: why } : x)));
    } catch {
      setPending((list) =>
        list.map((x) => (x.clientId === p.clientId ? { ...x, failed: "Not sent — check your connection." } : x)),
      );
    }
  }

  function send() {
    const text = draft.trim();
    if (!text || text.length > MAX_MESSAGE || status === "ended" || status === "not_started") return;
    const p: Pending = { clientId: newId(12), text, at: new Date().toISOString() };
    setPending((list) => [...list, p]);
    setDraft("");
    atBottom.current = true;
    lastTypingSent.current = 0;
    void deliver(p);
    inputRef.current?.focus();
  }

  function onDraft(value: string) {
    setDraft(value);
    const nowMs = Date.now();
    if (value.trim() && nowMs - lastTypingSent.current > 3000) {
      lastTypingSent.current = nowMs;
      void fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, action: "typing", typing: true }),
      }).catch(() => {});
    }
  }

  // Auto-grow the box up to about six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const waitedMin = startedAt ? (now - Date.parse(startedAt)) / 60000 : 0;
  const busy = status === "waiting" && waitedMin >= BUSY_AFTER_MINUTES;
  const touch = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const over = draft.length > MAX_MESSAGE;

  /* -- the link stopped working mid-chat --------------------------------- */
  if (blocked) {
    return (
      <Frame status="ended" statusLabel="Chat unavailable">
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-3xl border border-navy-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-navy-600">
              <Icon name="chat" className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-navy-900">
              {blocked === "replaced"
                ? "A newer chat link was sent"
                : blocked === "expired"
                  ? "This chat link has expired"
                  : "This chat link no longer works"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-navy-600">
              {blocked === "replaced"
                ? "Please open the link in the most recent email we sent you."
                : "Please reply to our email and we will send you a new link."}
            </p>
          </div>
        </div>
      </Frame>
    );
  }

  /* -- before Start -------------------------------------------------------- */
  if (status === "not_started") {
    return (
      <Frame status="idle" statusLabel="Final interview">
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-12">
          <div className="w-full max-w-lg">
            <div className="overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card">
              <div className="relative bg-navy-900 px-6 pb-8 pt-7 text-white sm:px-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-2xl" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-300">
                  <Icon name="sparkles" className="h-3.5 w-3.5" /> Final stage
                </span>
                <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                  Hi {firstName}, welcome to your final interview
                </h1>
                {position ? (
                  <p className="mt-2 text-sm text-navy-200">For the {position} role</p>
                ) : null}
              </div>

              <div className="px-6 py-6 sm:px-8">
                <p className="text-sm leading-relaxed text-navy-600">
                  This is a live text chat with our recruitment team. There is no video or call —
                  you answer a few questions in writing, in your own words.
                </p>

                <ol className="mt-5 space-y-3">
                  {[
                    ["Press Start chat", "You join the queue and we are told you are here."],
                    ["A recruiter joins you", "Usually within a few minutes during our hours."],
                    ["Answer a few questions", "It takes about 15–20 minutes."],
                  ].map(([title, sub], i) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-800">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-navy-900">{title}</span>
                        <span className="block text-xs text-navy-500">{sub}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                {hours ? (
                  <p className="mt-5 flex items-center gap-2 rounded-xl bg-cream-100 px-4 py-3 text-sm font-semibold text-navy-800">
                    <Icon name="clock" className="h-4 w-4 shrink-0 text-brand-600" />
                    {hours}
                  </p>
                ) : null}

                {startError ? (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {startError}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void start()}
                  disabled={starting}
                  className="btn-primary mt-6 w-full justify-center py-3.5 text-base disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon name="chat" className="h-5 w-5" />
                  {starting ? "Starting…" : "Start chat"}
                </button>
                <p className="mt-3 text-center text-xs text-navy-400">
                  Find a quiet place with a stable connection. If you close this page, the same link
                  brings you back.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  /* -- the conversation --------------------------------------------------- */
  const statusLabel =
    status === "ended" ? "Chat ended" : status === "active" ? "Online" : "Waiting for a recruiter";

  return (
    <Frame status={status} statusLabel={statusLabel} offline={offline}>
      <div className="relative min-h-0 flex-1">
        <div ref={listRef} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain">
          <div className="mx-auto flex max-w-3xl flex-col gap-1 px-3 py-5 sm:px-6">
            {status === "waiting" ? (
              <div className="mx-auto mb-4 w-full max-w-md rounded-2xl border border-brand-200 bg-white p-5 text-center shadow-sm">
                <span className="relative mx-auto flex h-14 w-14 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-300/40" />
                  <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Icon name="headset" className="h-7 w-7" />
                  </span>
                </span>
                {busy ? (
                  <>
                    <p className="mt-3 text-base font-bold text-navy-900">Our team is busy right now</p>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">
                      Please stay on this page, or come back later using the same link — your chat
                      will still be here.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-base font-bold text-navy-900">Waiting for a recruiter to join…</p>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">
                      You are in the queue. You can type your first message while you wait.
                    </p>
                  </>
                )}
                {hours ? <p className="mt-3 text-xs font-semibold text-navy-500">{hours}</p> : null}
              </div>
            ) : null}

            {messages.map((m, i) => {
              const prev = messages[i - 1];
              if (m.from === "system") {
                return (
                  <div key={m.id} className="my-2 flex justify-center">
                    <span className="rounded-full bg-navy-100/70 px-3 py-1 text-[11px] font-semibold text-navy-600">
                      {m.text} · {time(m.at)}
                    </span>
                  </div>
                );
              }
              const mine = m.from === "candidate";
              const grouped = prev && prev.from === m.from;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}>
                  {!mine ? (grouped ? <span className="w-8 shrink-0" /> : <Avatar />) : null}
                  <div className={`flex max-w-[82%] flex-col ${mine ? "items-end" : "items-start"} sm:max-w-[70%]`}>
                    {!mine && !grouped ? (
                      <span className="mb-1 ml-1 text-[11px] font-bold text-navy-500">{RECRUITER_NAME}</span>
                    ) : null}
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                        mine
                          ? "rounded-br-md bg-brand-500 text-navy-900"
                          : "rounded-bl-md border border-navy-100 bg-white text-navy-800"
                      }`}
                    >
                      {mine ? m.text : <Linked text={m.text} />}
                    </div>
                    <span className="mx-1 mt-1 text-[10px] font-medium text-navy-400">{time(m.at)}</span>
                  </div>
                </div>
              );
            })}

            {pending.map((p) => (
              <div key={p.clientId} className="mt-3 flex justify-end">
                <div className="flex max-w-[82%] flex-col items-end sm:max-w-[70%]">
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed ${
                      p.failed ? "border border-red-200 bg-red-50 text-red-900" : "bg-brand-500/60 text-navy-900"
                    }`}
                  >
                    {p.text}
                  </div>
                  {p.failed ? (
                    <span className="mx-1 mt-1 flex items-center gap-2 text-[11px] font-semibold text-red-700">
                      {p.failed}
                      {status !== "ended" ? (
                        <button type="button" onClick={() => void deliver(p)} className="underline hover:text-red-900">
                          Try again
                        </button>
                      ) : null}
                    </span>
                  ) : (
                    <span className="mx-1 mt-1 text-[10px] font-medium text-navy-400">Sending…</span>
                  )}
                </div>
              </div>
            ))}

            {recruiterTyping && status === "active" ? (
              <div className="mt-3 flex items-end gap-2" aria-live="polite">
                <Avatar />
                <div className="rounded-2xl rounded-bl-md border border-navy-100 bg-white px-4 py-3 shadow-sm">
                  <span className="sr-only">The recruiter is typing</span>
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-navy-300" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {showJump ? (
          <button
            type="button"
            onClick={jump}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-xs font-bold text-white shadow-lg"
          >
            <Icon name="chevronDown" className="h-3.5 w-3.5" /> New messages
          </button>
        ) : null}
      </div>

      {status === "ended" ? (
        <div className="border-t border-navy-100 bg-white px-4 py-5">
          <div className="mx-auto flex max-w-3xl items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Icon name="checkCircle" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-navy-900">
                {endedReason === "replaced" ? "This chat was closed" : "This chat has ended"}
              </p>
              <p className="mt-0.5 text-sm text-navy-600">
                {endedReason === "replaced"
                  ? "A newer chat link was sent to you. Please use the link in the most recent email."
                  : `Thank you, ${firstName}. We will be in touch by email.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form
          className="border-t border-navy-100 bg-white px-3 py-3 sm:px-6"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">
              Your message
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends on a keyboard; on a phone it is a new line, and
                // the button sends.
                if (e.key === "Enter" && !e.shiftKey && !touch && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your message…"
              className="max-h-40 min-h-[46px] flex-1 resize-none rounded-2xl border-2 border-navy-100 bg-cream-50 px-4 py-2.5 text-[15px] leading-relaxed text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim() || over}
              aria-label="Send message"
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-brand-500 text-navy-900 shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <Icon name="send" className="h-5 w-5" />
            </button>
          </div>
          {draft.length > MAX_MESSAGE - 300 ? (
            <p className={`mx-auto mt-1 max-w-3xl text-right text-[11px] ${over ? "font-bold text-red-700" : "text-navy-400"}`}>
              {draft.length} / {MAX_MESSAGE}
            </p>
          ) : null}
        </form>
      )}
    </Frame>
  );
}

/** The fixed chrome: header, the scam line, and the body slot. */
function Frame({
  status,
  statusLabel,
  offline,
  children,
}: {
  status: "idle" | "waiting" | "active" | "ended";
  statusLabel: string;
  offline?: boolean;
  children: React.ReactNode;
}) {
  const dot =
    status === "active" ? "bg-green-500" : status === "waiting" ? "bg-brand-500 animate-pulse" : "bg-navy-300";
  return (
    <div className="flex h-[100dvh] flex-col bg-cream-100">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative">
              <Avatar />
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${dot}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-navy-900">{RECRUITER_NAME}</p>
              <p className="truncate text-xs font-medium text-navy-500">{statusLabel}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-navy-900 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-300">
            Final interview
          </span>
        </div>
        <div className="border-t border-amber-100 bg-amber-50/70">
          <p className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-1.5 text-[11px] font-medium text-amber-900 sm:px-6">
            <Icon name="shield" className="h-3.5 w-3.5 shrink-0" />
            We will never ask you for a payment, bank card or password in this chat.
          </p>
        </div>
        {offline ? (
          <div role="status" className="bg-navy-900 px-4 py-1.5 text-center text-xs font-semibold text-white">
            Connection lost — reconnecting…
          </div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
