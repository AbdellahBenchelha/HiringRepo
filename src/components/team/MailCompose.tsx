"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { problemOf, teamForm } from "@/lib/teamClient";
import { MAX_MAIL_ATTACHMENTS_BYTES, MAX_MAIL_BODY } from "@/lib/teamShared";

/**
 * Writing an email: a new one, a reply or a forward. The original of a reply
 * or forward is added underneath by the server, so it is shown here only as
 * a reminder of what is being answered.
 */
export function MailCompose({
  from,
  initial,
  replyTo,
  forwardOf,
  original,
  originalHasAttachments,
}: {
  from: string;
  initial: { to: string; cc: string; subject: string };
  replyTo?: string;
  forwardOf?: string;
  original?: { from: string; when: string; snippet: string };
  originalHasAttachments?: boolean;
}) {
  const router = useRouter();
  const [to, setTo] = useState(initial.to);
  const [cc, setCc] = useState(initial.cc);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const size = files.reduce((s, f) => s + f.size, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (size > MAX_MAIL_ATTACHMENTS_BYTES) {
      setError("The attachments are larger than 10 MB in total.");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("to", to);
    form.set("cc", cc);
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
    <form onSubmit={submit} className="space-y-4" noValidate data-mail-compose>
      <p className="text-sm text-navy-500">
        From <strong className="text-navy-900">{from}</strong>
      </p>
      <div>
        <label htmlFor="mail-to" className="label">
          To
        </label>
        <input id="mail-to" value={to} onChange={(e) => setTo(e.target.value)} className="input" placeholder="name@example.com" autoComplete="email" />
        <p className="mt-1 text-xs text-navy-400">Several addresses: separate them with commas.</p>
      </div>
      <div>
        <label htmlFor="mail-cc" className="label">
          Cc (optional)
        </label>
        <input id="mail-cc" value={cc} onChange={(e) => setCc(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="mail-subject" className="label">
          Subject
        </label>
        <input id="mail-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="mail-body" className="label">
          Message
        </label>
        <textarea id="mail-body" value={body} maxLength={MAX_MAIL_BODY} onChange={(e) => setBody(e.target.value)} className="textarea min-h-[12rem]" />
      </div>
      {original ? (
        <div className="rounded-xl border border-cream-300 bg-cream-100 p-3 text-sm text-navy-600" data-original>
          <p className="text-xs font-semibold text-navy-500">
            {replyTo ? "Replying to" : "Forwarding"} {original.from} · {original.when} — included below your message
          </p>
          <p className="mt-1 line-clamp-3">{original.snippet}</p>
          {forwardOf && originalHasAttachments ? (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeAttachments} onChange={(e) => setIncludeAttachments(e.target.checked)} />
              Include the original attachments
            </label>
          ) : null}
        </div>
      ) : null}
      <div>
        <label htmlFor="mail-files" className="label">
          Attachments (optional, 10 MB in total)
        </label>
        <input
          id="mail-files"
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cream-200 file:px-3 file:py-2 file:font-semibold file:text-navy-800"
        />
        {files.length ? (
          <p className={`mt-1 text-xs ${size > MAX_MAIL_ATTACHMENTS_BYTES ? "text-red-600" : "text-navy-400"}`}>
            {files.length} file{files.length === 1 ? "" : "s"}, {(size / 1024 / 1024).toFixed(1)} MB
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Sending…" : "Send"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}
