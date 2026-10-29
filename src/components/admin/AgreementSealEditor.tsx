"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost, csrfToken } from "@/lib/adminClient";

type Kind = "signature" | "stamp";
type Info = { uploadedAt: string; by: string } | null;

const TEXT: Record<Kind, { title: string; help: string; empty: string }> = {
  signature: {
    title: "Director’s signature",
    help: "Printed in the Company’s signature box, above Patrick Meyer, Director. A PNG with a transparent background looks best.",
    empty: "No signature yet — agreements show the director’s name typed instead.",
  },
  stamp: {
    title: "Company stamp",
    help: "Pressed over the lower right of the Company’s signature box. PNG, JPG or WebP.",
    empty: "No stamp yet — agreements are sent without one.",
  },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Upload, see and remove the signature and stamp printed on the final agreement. */
export function AgreementSealEditor({ initial }: { initial: Record<Kind, Info> }) {
  const [info, setInfo] = useState(initial);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {(["signature", "stamp"] as const).map((k) => (
        <SealCard key={k} kind={k} info={info[k]} onChange={(next) => setInfo(next)} />
      ))}
    </div>
  );
}

function SealCard({ kind, info, onChange }: { kind: Kind; info: Info; onChange: (next: Record<Kind, Info>) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const t = TEXT[kind];

  async function done(res: Response, ok: string) {
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; problems?: string[]; signature?: Info; stamp?: Info };
    if (!data.ok) {
      setMessage({ ok: false, text: res.status === 401 ? "Your admin session has expired — sign in again." : data.problems?.[0] ?? "That did not work." });
      return;
    }
    onChange({ signature: data.signature ?? null, stamp: data.stamp ?? null });
    setMessage({ ok: true, text: ok });
  }

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);
      const res = await fetch("/api/admin/agreement-seal", { method: "POST", headers: { "x-csrf-token": csrfToken() }, body: form });
      await done(res, "Saved — agreements sent from now on carry it.");
    } catch {
      setMessage({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !window.confirm(`Remove the ${kind}? Agreements sent from now on will not carry it.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await done(await adminPost("/api/admin/agreement-seal", { action: "remove", kind }), "Removed.");
    } catch {
      setMessage({ ok: false, text: "Could not reach the server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6" data-seal={kind} data-seal-state={info ? "set" : "empty"}>
      <h3 className="text-base font-bold text-navy-900">{t.title}</h3>
      <p className="mt-1 text-sm text-navy-500">{t.help}</p>
      <div className="mt-4 flex h-44 items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-[repeating-conic-gradient(#f4f2ea_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] p-3">
        {info ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/admin/agreement-seal?file=${kind}&v=${encodeURIComponent(info.uploadedAt)}`}
            alt={t.title}
            className="max-h-full max-w-full object-contain"
            data-seal-preview
          />
        ) : (
          <p className="max-w-xs text-center text-sm text-navy-400">{t.empty}</p>
        )}
      </div>
      {info ? (
        <p className="mt-2 text-xs text-navy-400">
          Uploaded {fmt(info.uploadedAt)} by {info.by}
        </p>
      ) : null}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
        data-seal-file
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => input.current?.click()} disabled={busy} className="btn-primary px-4 py-2" data-seal-upload>
          <Icon name="upload" className="h-4 w-4" />
          {busy ? "Saving…" : info ? "Replace" : "Upload"}
        </button>
        {info ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            data-seal-remove
          >
            <Icon name="trash" className="h-4 w-4" />
            Remove
          </button>
        ) : null}
      </div>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 text-sm font-medium ${message.ok ? "text-green-700" : "text-red-700"}`} data-seal-result={message.ok ? "ok" : "error"}>
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
