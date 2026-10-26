"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { RichTextEditor, cleanForEditor } from "@/components/admin/RichTextEditor";
import { MAX_SUBJECT, type ComposeDesign } from "@/lib/composeOptions";
import type { SentEmailSummary } from "@/lib/sentEmailStore";

/**
 * The Send email tab: one email, written here, to one address.
 *
 * From is fixed — the address ZeptoMail is set up to send from — and replies go
 * to the recruitment inbox. To can be typed or picked from the candidates.
 * Nothing leaves without a preview being one click away and a confirm step,
 * and every send (or failure) is listed underneath.
 *
 * The draft is kept in this browser until it is sent, so a reload or a closed
 * tab does not lose a half-written letter.
 */

const DRAFT_KEY = "wr.compose.draft.v1";

interface Draft {
  to: string;
  toName: string;
  candidateId: string;
  subject: string;
  html: string;
  design: ComposeDesign;
}

interface Found {
  id: string;
  name: string;
  email: string;
  country: string;
  status: string;
}

const ERRORS: Record<string, string> = {
  too_soon: "The same email went to this address less than a minute ago.",
  fake_recipient: "That address is a test or throwaway address and cannot receive email.",
  not_configured: "Email sending is not set up on the server (ZeptoMail token or From address missing).",
  network_error: "Could not reach ZeptoMail. Please try again.",
  unauthorized: "Your admin session has expired — sign in again.",
};

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function ComposeEmail({
  fromAddress,
  fromName,
  replyTo,
  initialHistory,
  initialTotal,
}: {
  fromAddress: string;
  fromName: string;
  replyTo: string;
  initialHistory: SentEmailSummary[];
  initialTotal: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [to, setTo] = useState("");
  const [toName, setToName] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [design, setDesign] = useState<ComposeDesign>("workroute");
  const [loaded, setLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);

  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [overLimit, setOverLimit] = useState<{ remaining: number; cap: number } | null>(null);
  const [preview, setPreview] = useState<{ title: string; html: string; meta?: string } | null>(null);

  const [history, setHistory] = useState(initialHistory);
  const [total, setTotal] = useState(initialTotal);

  // ----- the draft, kept in this browser ------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        setTo(d.to ?? "");
        setToName(d.toName ?? "");
        setCandidateId(d.candidateId ?? "");
        setSubject(d.subject ?? "");
        setDesign(d.design === "plain" ? "plain" : "workroute");
        if (d.html && editorRef.current) {
          const restored = cleanForEditor(d.html);
          editorRef.current.innerHTML = restored;
          setHtml(restored);
        }
      }
    } catch {
      /* no saved draft, or storage blocked */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => {
      try {
        const draft: Draft = { to, toName, candidateId, subject, html, design };
        if (to || subject || html.replace(/<[^>]+>/g, "").trim()) {
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } else {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        /* storage full or blocked: the draft just is not kept */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [loaded, to, toName, candidateId, subject, html, design]);

  // ----- candidate search ---------------------------------------------------
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setFound([]);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/candidate-search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { ok?: boolean; results?: Found[] };
        setFound(data.ok ? data.results ?? [] : []);
      } catch {
        setFound([]);
      }
      setSearching(false);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  function pick(c: Found) {
    setTo(c.email);
    setToName(c.name);
    setCandidateId(c.id);
    setQuery("");
    setFound([]);
    setProblems([]);
  }

  function currentHtml() {
    return editorRef.current?.innerHTML ?? html;
  }

  function check(): string[] {
    const found: string[] = [];
    if (!to.trim()) found.push("Enter the address to send to.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) found.push("The To address does not look like an email address.");
    if (!subject.trim()) found.push("Write a subject.");
    if (!(editorRef.current?.innerText ?? "").trim() && !/<hr/i.test(currentHtml())) found.push("Write the email content.");
    return found;
  }

  async function showPreview() {
    setNotice("");
    try {
      const res = await adminPost("/api/admin/send-email", { action: "preview", subject, html: currentHtml(), design });
      const data = (await res.json()) as { ok?: boolean; html?: string; error?: string };
      if (data.ok && data.html) {
        setPreview({ title: subject || "(no subject)", html: data.html, meta: to ? `To: ${toName ? `${toName} <${to}>` : to}` : undefined });
      } else {
        setProblems([ERRORS[data.error ?? ""] ?? "Could not build the preview."]);
      }
    } catch {
      setProblems(["Could not reach the server."]);
    }
  }

  function askToSend() {
    const found = check();
    setProblems(found);
    setNotice("");
    if (!found.length) setConfirming(true);
  }

  async function send(override = false) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await adminPost("/api/admin/send-email", {
        action: "send",
        to: to.trim(),
        toName,
        candidateId,
        subject,
        html: currentHtml(),
        design,
        override,
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        problems?: string[];
        entry?: SentEmailSummary;
        allowance?: { remaining: number; cap: number };
      };
      setConfirming(false);
      if (data.ok && data.entry) {
        setHistory((h) => [data.entry as SentEmailSummary, ...h]);
        setTotal((t) => t + 1);
        setNotice(`Email sent to ${to.trim()}.`);
        setProblems([]);
        setOverLimit(null);
        // A fresh start for the next one.
        setTo("");
        setToName("");
        setCandidateId("");
        setSubject("");
        setHtml("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        try {
          window.localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* nothing to clear */
        }
      } else if (data.error === "warmup_limit" && data.allowance) {
        setOverLimit({ remaining: data.allowance.remaining, cap: data.allowance.cap });
      } else {
        if (data.entry) {
          setHistory((h) => [data.entry as SentEmailSummary, ...h]);
          setTotal((t) => t + 1);
        }
        setProblems(
          data.problems?.length
            ? data.problems
            : [res.status === 401 ? ERRORS.unauthorized : ERRORS[data.error ?? ""] ?? `Not sent (${data.error ?? "failed"}).`],
        );
      }
    } catch {
      setConfirming(false);
      setProblems(["Could not reach the server. Nothing was sent."]);
    }
    setBusy(false);
  }

  async function openSent(id: string) {
    try {
      const res = await fetch(`/api/admin/send-email?id=${encodeURIComponent(id)}`);
      const data = (await res.json()) as { ok?: boolean; html?: string; entry?: SentEmailSummary };
      if (data.ok && data.html && data.entry) {
        const e = data.entry;
        setPreview({
          title: e.subject,
          html: data.html,
          meta: `To: ${e.toName ? `${e.toName} <${e.to}>` : e.to} · ${fmt(e.at)} · by ${e.by}${e.status === "failed" ? ` · NOT SENT (${e.error ?? "failed"})` : ""}`,
        });
      }
    } catch {
      /* the row stays; nothing to show */
    }
  }

  async function loadMore() {
    try {
      const res = await fetch(`/api/admin/send-email?offset=${history.length}`);
      const data = (await res.json()) as { ok?: boolean; items?: SentEmailSummary[]; total?: number };
      if (data.ok && data.items) {
        setHistory((h) => [...h, ...(data.items as SentEmailSummary[])]);
        setTotal(data.total ?? total);
      }
    } catch {
      /* try again later */
    }
  }

  const fieldLabel = "w-20 shrink-0 pt-2.5 text-sm font-semibold text-navy-500";

  return (
    <>
      <section className="card p-0" data-compose>
        {/* From */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-navy-100 px-5 py-3">
          <span className={fieldLabel}>From</span>
          <div className="min-w-0 flex-1 pt-2">
            <p className="text-sm font-semibold text-navy-900" data-compose-from>
              {fromName} &lt;{fromAddress}&gt;
            </p>
            <p className="mt-0.5 text-xs text-navy-400">Replies go to {replyTo}</p>
          </div>
        </div>

        {/* To, with the candidate picker */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-navy-100 px-5 py-3">
          <label htmlFor="compose-to" className={fieldLabel}>
            To
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="compose-to"
                type="email"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  // A typed address is no longer the candidate who was picked.
                  setCandidateId("");
                  setToName("");
                  setProblems([]);
                }}
                placeholder="name@example.com"
                autoComplete="off"
                className="input !py-2 w-full min-w-0 sm:w-auto sm:max-w-sm sm:flex-1"
              />
              <div className="relative w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  id="compose-find"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Or find a candidate…"
                  aria-label="Find a candidate by name or email"
                  autoComplete="off"
                  className="input !py-2 !pl-9"
                />
                {query.trim().length >= 2 ? (
                  <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-navy-200 bg-white shadow-lg" data-compose-results>
                    {found.length ? (
                      found.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => pick(c)}
                            className="block w-full px-4 py-2.5 text-left transition hover:bg-navy-50"
                          >
                            <span className="block text-sm font-semibold text-navy-900">{c.name || "(no name)"}</span>
                            <span className="block text-xs text-navy-500">
                              {c.email}
                              {c.country ? ` · ${c.country}` : ""} · {c.status}
                            </span>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-navy-500">{searching ? "Searching…" : "No candidate found."}</li>
                    )}
                  </ul>
                ) : null}
              </div>
            </div>
            {candidateId ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800" data-compose-candidate>
                <Icon name="user" className="h-3.5 w-3.5" />
                Candidate: {toName}
              </p>
            ) : null}
          </div>
        </div>

        {/* Subject */}
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b border-navy-100 px-5 py-3">
          <label htmlFor="compose-subject" className={fieldLabel}>
            Subject
          </label>
          <div className="min-w-0 flex-1">
            <input
              id="compose-subject"
              value={subject}
              maxLength={MAX_SUBJECT}
              onChange={(e) => {
                setSubject(e.target.value);
                setProblems([]);
              }}
              placeholder="What the email is about"
              className="input !py-2"
            />
            {subject.length > MAX_SUBJECT - 40 ? (
              <p className="mt-1 text-right text-xs text-navy-400">
                {subject.length} / {MAX_SUBJECT}
              </p>
            ) : null}
          </div>
        </div>

        {/* Design */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-navy-100 px-5 py-3">
          <span className="w-20 shrink-0 text-sm font-semibold text-navy-500">Design</span>
          <div role="radiogroup" aria-label="Email design" className="inline-flex rounded-full bg-navy-50 p-1">
            {(
              [
                ["workroute", "WorkRoute design"],
                ["plain", "Plain email"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={design === value}
                onClick={() => setDesign(value)}
                data-compose-design={value}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  design === value ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-navy-400">
            {design === "workroute" ? "Logo at the top, your message in a white card, contact footer." : "Just your message, like an email from Gmail."}
          </span>
        </div>

        {/* The message */}
        <div className="px-5 py-4">
          <RichTextEditor editorRef={editorRef} onChange={setHtml} placeholder="Write your email here…" disabled={busy} />

          {problems.length ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" data-compose-problems>
              {problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          ) : null}
          {notice ? (
            <p role="status" className="mt-4 flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800" data-compose-sent>
              <Icon name="checkCircle" className="h-4 w-4" />
              {notice}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={askToSend} disabled={busy} className="btn-primary !px-6 !py-2.5 text-sm" data-compose-send>
              <Icon name="send" className="h-4 w-4" />
              {busy ? "Sending…" : "Send email"}
            </button>
            <button
              type="button"
              onClick={() => void showPreview()}
              disabled={busy}
              className="rounded-xl border border-navy-200 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:bg-navy-50"
              data-compose-preview
            >
              Preview
            </button>
            <span className="text-xs text-navy-400">Your draft is kept in this browser until you send it.</span>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="card mt-6 p-0" data-compose-history>
        <header className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
          <h2 className="text-base font-bold text-navy-900">Sent from this tab</h2>
          <span className="text-xs text-navy-400">{total} in all</span>
        </header>
        {history.length ? (
          <ul className="divide-y divide-navy-50">
            {history.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => void openSent(e.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-left transition hover:bg-navy-50/60"
                >
                  <span className="w-36 shrink-0 text-xs text-navy-400">{fmt(e.at)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900">{e.subject}</span>
                    <span className="block truncate text-xs text-navy-500">
                      To {e.toName ? `${e.toName} <${e.to}>` : e.to} · by {e.by}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      e.status === "sent" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {e.status === "sent" ? "Sent" : `Not sent${e.error ? ` · ${e.error}` : ""}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-navy-500">Nothing sent from here yet.</p>
        )}
        {history.length < total ? (
          <div className="border-t border-navy-100 px-5 py-3">
            <button type="button" onClick={() => void loadMore()} className="text-sm font-semibold text-brand-700 hover:underline">
              Show older
            </button>
          </div>
        ) : null}
      </section>

      {/* Confirm */}
      <ConfirmDialog
        open={confirming}
        icon="mail"
        title="Send this email?"
        confirmLabel={busy ? "Sending…" : "Send email"}
        busy={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void send(false)}
        body={
          <div className="space-y-1">
            <p>
              To <strong className="text-navy-900">{toName ? `${toName} <${to.trim()}>` : to.trim()}</strong>
            </p>
            <p>
              Subject: <strong className="text-navy-900">{subject}</strong>
            </p>
            <p className="text-xs text-navy-500">{design === "workroute" ? "WorkRoute design" : "Plain email"} · from {fromAddress}</p>
          </div>
        }
      />
      <ConfirmDialog
        open={!!overLimit}
        icon="mail"
        tone="danger"
        title="Today's sending limit is reached"
        confirmLabel={busy ? "Sending…" : "Send it anyway"}
        busy={busy}
        onCancel={() => setOverLimit(null)}
        onConfirm={() => void send(true)}
        body={
          <p>
            {overLimit ? `${overLimit.cap - overLimit.remaining} of today's ${overLimit.cap} emails are already used.` : ""} Sending
            past the warm-up limit is recorded on the Warm-up tab. You can also wait until tomorrow — your draft stays here.
          </p>
        }
      />

      {/* Preview */}
      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Email preview"
          onClick={() => setPreview(null)}
          data-compose-preview-dialog
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-start justify-between gap-3 border-b border-navy-100 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-navy-900">{preview.title}</p>
                {preview.meta ? <p className="mt-0.5 truncate text-xs text-navy-500">{preview.meta}</p> : null}
              </div>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="rounded-lg p-2 text-navy-500 hover:bg-navy-100">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </header>
            {/* sandbox with no permissions: no scripts, no navigation, no forms */}
            <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="h-[70vh] w-full flex-1 border-0 bg-white" />
          </div>
        </div>
      ) : null}
    </>
  );
}
