"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { problemOf } from "@/lib/teamClient";
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABEL, MAX_TICKET_BODY, MAX_TICKET_SUBJECT } from "@/lib/teamShared";

function csrfFrom(cookie: string): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${cookie}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * Writing on a ticket — a new one, or a reply — with up to three
 * screenshots. Used by members (portal cookie) and recruiters (admin cookie).
 */
export function TicketForm({
  url,
  side,
  mode,
  after,
  extraFields,
  memberIds,
}: {
  url: string;
  side: "member" | "admin";
  mode: "new" | "reply";
  /** Where to go once sent; the response's id is appended for a new ticket. */
  after?: string;
  extraFields?: ReactNode;
  /** Admin, new ticket: who it goes to. */
  memberIds?: string[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    form.delete("files");
    for (const f of files) form.append("files", f);
    for (const id of memberIds ?? []) form.append("memberIds", id);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-csrf-token": csrfFrom(side === "member" ? "wr_team_csrf" : "wr_admin_csrf") },
        body: form,
      });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      const data = (await res.json()) as { id?: string };
      formRef.current?.reset();
      setFiles([]);
      if (after) router.push(mode === "new" && data.id ? `${after}/${data.id}` : after);
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate data-ticket-form={mode}>
      {extraFields}
      {mode === "new" ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label htmlFor="ticket-subject" className="label">
              Subject
            </label>
            <input id="ticket-subject" name="subject" maxLength={MAX_TICKET_SUBJECT} className="input" required />
          </div>
          <div>
            <label htmlFor="ticket-priority" className="label">
              Priority
            </label>
            <select id="ticket-priority" name="priority" defaultValue="normal" className="select">
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {TICKET_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      <div>
        <label htmlFor={`ticket-body-${mode}`} className="label">
          {mode === "new" ? "Message" : "Your reply"}
        </label>
        <textarea id={`ticket-body-${mode}`} name="body" maxLength={MAX_TICKET_BODY} className="textarea" required />
      </div>
      <div>
        <label htmlFor={`ticket-files-${mode}`} className="label">
          Screenshots (optional, up to 3 images, 5 MB each)
        </label>
        <input
          id={`ticket-files-${mode}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
          className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-cream-200 file:px-3 file:py-2 file:font-semibold file:text-navy-800"
        />
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? "Sending…" : mode === "new" ? "Send ticket" : "Send reply"}
      </button>
    </form>
  );
}
