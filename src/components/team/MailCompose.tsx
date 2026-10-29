"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { problemOf, teamForm } from "@/lib/teamClient";
import { MAX_MAIL_ATTACHMENTS_BYTES, MAX_MAIL_BODY, formatFileSize } from "@/lib/teamShared";
import { Icon } from "@/components/Icon";

/** One line of the message head: a label on the left, the field on the right. */
function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-cream-200 px-4 sm:px-5">
      <label htmlFor={htmlFor} className="w-16 shrink-0 py-3 text-sm font-medium text-navy-400">
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

const FIELD = "min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-0";

/**
 * Writing an email: a new one, a reply or a forward. The original of a reply
 * or forward is added underneath by the server, so it is shown here only as
 * a reminder of what is being answered.
 */
export function MailCompose({
  from,
  fromName,
  title,
  notice,
  initial,
  replyTo,
  forwardOf,
  original,
  originalHasAttachments,
}: {
  from: string;
  fromName: string;
  title: string;
  /** Shown above the form, e.g. when sending is not set up. */
  notice?: ReactNode;
  initial: { to: string; cc: string; subject: string };
  replyTo?: string;
  forwardOf?: string;
  original?: { from: string; when: string; snippet: string };
  originalHasAttachments?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [showCc, setShowCc] = useState(!!initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const size = files.reduce((s, f) => s + f.size, 0);
  const tooBig = size > MAX_MAIL_ATTACHMENTS_BYTES;

  function addFiles(list: FileList | null) {
    const added = Array.from(list ?? []);
    if (added.length) setFiles((old) => [...old, ...added]);
    // Picking the same file again after removing it still counts as a change.
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (tooBig) {
      setError("The attachments are larger than 10 MB in total.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("to", to);
    form.set("cc", showCc ? cc : "");
    form.set("subject", subject);
    form.set("body", body);
    if (replyTo) form.set("replyTo", replyTo);
    if (forwardOf) {
      form.set("forwardOf", forwardOf);
      if (includeAttachments) form.set("includeAttachments", "1");
    }
    for (const f of files) form.append("files", f);
    try {
      const res = await teamForm("/api/team/mail/send", form);
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      router.push("/mail?folder=sent&sent=1");
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate data-mail-compose>
      <div className="flex items-center gap-2 border-b border-cream-200 bg-cream-50 px-4 py-3 sm:px-5">
        <Icon name={replyTo ? "reply" : forwardOf ? "forward" : "pencil"} className="h-4 w-4 text-brand-600" />
        <h2 className="font-display text-lg font-extrabold text-navy-900">{title}</h2>
      </div>
      {notice}

      <Row label="From">
        <span className="flex min-w-0 items-center gap-2 py-2">
          <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-cream-300 bg-cream-50 py-1 pl-1 pr-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-brand-400">
              <Icon name="mailLine" className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">
              <span className="font-semibold text-navy-900">{fromName}</span> <span className="text-navy-500">&lt;{from}&gt;</span>
            </span>
          </span>
        </span>
      </Row>
      <Row label="To" htmlFor="mail-to">
        <input id="mail-to" value={to} onChange={(e) => setTo(e.target.value)} className={FIELD} placeholder="name@example.com, another@example.com" autoComplete="email" />
        {!showCc ? (
          <button type="button" onClick={() => setShowCc(true)} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-navy-500 hover:bg-cream-200 hover:text-navy-900">
            Cc
          </button>
        ) : null}
      </Row>
      {showCc ? (
        <Row label="Cc" htmlFor="mail-cc">
          <input id="mail-cc" value={cc} onChange={(e) => setCc(e.target.value)} className={FIELD} placeholder="Optional" autoFocus={!initial.cc} />
        </Row>
      ) : null}
      <Row label="Subject" htmlFor="mail-subject">
        <input id="mail-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className={`${FIELD} font-semibold`} />
      </Row>

      <label htmlFor="mail-body" className="sr-only">
        Message
      </label>
      <textarea
        id="mail-body"
        value={body}
        maxLength={MAX_MAIL_BODY}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your message…"
        className="block min-h-[16rem] w-full resize-y border-0 bg-transparent px-4 py-4 text-[15px] leading-relaxed text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-0 sm:px-5"
      />

      {original ? (
        <div className="mx-4 mb-4 rounded-xl border-l-4 border-brand-400 bg-cream-100 p-3 text-sm text-navy-600 sm:mx-5" data-original>
          <p className="text-xs font-semibold text-navy-500">
            {replyTo ? "Replying to" : "Forwarding"} {original.from} · {original.when} — included below your message
          </p>
          <p className="mt-1 line-clamp-3">{original.snippet}</p>
          {forwardOf && originalHasAttachments ? (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeAttachments} onChange={(e) => setIncludeAttachments(e.target.checked)} className="rounded border-cream-400 text-brand-600 focus:ring-brand-300" />
              Include the original attachments
            </label>
          ) : null}
        </div>
      ) : null}

      {files.length ? (
        <div className="px-4 pb-3 sm:px-5">
          <ul className="flex flex-wrap gap-2" data-mail-files>
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-cream-300 bg-cream-50 py-1 pl-2.5 pr-1 text-sm">
                <Icon name="paperclip" className="h-3.5 w-3.5 shrink-0 text-navy-400" />
                <span className="truncate text-navy-800">{f.name}</span>
                <span className="shrink-0 text-xs text-navy-400">{formatFileSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((old) => old.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-md p-1 text-navy-400 hover:bg-cream-200 hover:text-red-600"
                  aria-label={`Remove ${f.name}`}
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <p className={`mt-1.5 text-xs ${tooBig ? "font-semibold text-red-600" : "text-navy-400"}`}>
            {formatFileSize(size)} of 10 MB
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="field-error mx-4 mb-3 mt-0 rounded-lg bg-red-50 px-3 py-2 sm:mx-5">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-1 border-t border-cream-200 bg-cream-50 px-4 py-3 sm:gap-2 sm:px-5">
        <button type="submit" disabled={busy} className="btn-primary px-6 py-2.5">
          <Icon name="send" className="h-4 w-4" />
          {busy ? "Sending…" : "Send"}
        </button>
        <label
          htmlFor="mail-files"
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold text-navy-600 transition hover:bg-cream-200 hover:text-navy-900"
        >
          <Icon name="paperclip" className="h-4 w-4" /> Attach files
        </label>
        <input id="mail-files" ref={fileInput} type="file" multiple onChange={(e) => addFiles(e.target.files)} className="sr-only" />
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-navy-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <Icon name="trash" className="h-4 w-4" />
          <span className="hidden sm:inline">Discard</span>
          <span className="sr-only sm:hidden">Discard</span>
        </button>
      </div>
    </form>
  );
}
