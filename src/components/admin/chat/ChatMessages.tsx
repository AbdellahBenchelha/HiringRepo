"use client";

import { splitLinks, type ChatMessage } from "@/lib/chat";

/**
 * A conversation from the recruiter's side, shared by the Live chat tab and
 * the transcript in View info.
 *
 * Recruiter links are clickable, as they are for the candidate. Links the
 * candidate typed are shown as text: a recruiter should decide to visit a
 * candidate's link, not arrive there by clicking a message.
 */

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function RecruiterText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) =>
        p.kind === "link" ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold underline underline-offset-2">
            {p.text}
          </a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function ChatMessages({ messages, compact }: { messages: ChatMessage[]; compact?: boolean }) {
  return (
    <div className="flex flex-col">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
        return (
          <div key={m.id}>
            {newDay ? (
              <div className="my-3 flex justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-400">{day(m.at)}</span>
              </div>
            ) : null}
            {m.from === "system" ? (
              <div className="my-2 flex justify-center">
                <span className="rounded-full bg-navy-100 px-3 py-1 text-[11px] font-semibold text-navy-600">
                  {m.text} · {time(m.at)}
                </span>
              </div>
            ) : (
              <div
                className={`flex ${m.from === "recruiter" ? "justify-end" : "justify-start"} ${
                  prev && prev.from === m.from && !newDay ? "mt-0.5" : "mt-2.5"
                }`}
              >
                <div className={`flex flex-col ${m.from === "recruiter" ? "items-end" : "items-start"} ${compact ? "max-w-[88%]" : "max-w-[75%]"}`}>
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.from === "recruiter"
                        ? "rounded-br-md bg-navy-900 text-white"
                        : "rounded-bl-md border border-navy-100 bg-white text-navy-800 shadow-sm"
                    }`}
                  >
                    {m.from === "recruiter" ? <RecruiterText text={m.text} /> : m.text}
                  </div>
                  <span className="mx-1 mt-0.5 text-[10px] text-navy-400">{time(m.at)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
