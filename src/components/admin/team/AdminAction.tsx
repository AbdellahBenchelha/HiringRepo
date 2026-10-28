"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { adminDelete, adminPost } from "@/lib/adminClient";
import { refreshAfterSave } from "@/lib/refreshAfterSave";

async function problemOf(res: Response): Promise<string> {
  try {
    const d = (await res.json()) as { problems?: string[]; error?: string };
    return d.problems?.[0] || d.error || "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

/**
 * One button in the team tabs that posts one change, then refreshes the page.
 * `ask` turns it into a prompt first (a reason for a refusal, say), whose
 * answer is sent as `askField`.
 */
export function AdminAction({
  url,
  body,
  children,
  className = "rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-50",
  confirm,
  ask,
  askField = "reason",
  onDone,
}: {
  url: string;
  body: Record<string, unknown>;
  children: ReactNode;
  className?: string;
  confirm?: string;
  ask?: string;
  askField?: string;
  onDone?: (data: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    let extra: Record<string, unknown> = {};
    if (ask) {
      const answer = window.prompt(ask);
      if (answer === null) return;
      extra = { [askField]: answer };
    } else if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(url, { ...body, ...extra });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      onDone?.(data);
      refreshAfterSave(router);
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? "…" : children}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export type FieldSpec = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: { value: string; label: string }[];
  step?: string;
  wide?: boolean;
};

/**
 * A small form in the team tabs: a few fields, one button, posted as JSON
 * with `body` merged in. Cleared after it works, unless `keep`.
 */
export function AdminForm({
  url,
  body = {},
  fields,
  submit,
  keep,
  done,
}: {
  url: string;
  body?: Record<string, unknown>;
  fields: FieldSpec[];
  submit: string;
  keep?: boolean;
  done?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data: Record<string, unknown> = { ...body };
    for (const f of fields) {
      const el = form.elements.namedItem(f.name) as HTMLInputElement | null;
      if (!el) continue;
      data[f.name] = f.type === "checkbox" ? el.checked : el.value;
    }
    setBusy(true);
    setError("");
    setOk(false);
    try {
      const res = await adminPost(url, data);
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      if (!keep) form.reset();
      setOk(true);
      refreshAfterSave(router);
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end" noValidate>
      {fields.map((f) => {
        const id = `f-${url.replace(/\W/g, "")}-${String(body.action ?? "")}-${f.name}`;
        if (f.type === "checkbox") {
          return (
            <label key={f.name} className={`flex items-center gap-2 text-sm text-navy-700 ${f.wide ? "sm:col-span-2 lg:col-span-4" : ""}`}>
              <input id={id} name={f.name} type="checkbox" defaultChecked={!!f.defaultValue} />
              {f.label}
            </label>
          );
        }
        return (
          <div key={f.name} className={f.wide || f.type === "textarea" ? "sm:col-span-2 lg:col-span-4" : ""}>
            <label htmlFor={id} className="mb-1 block text-xs font-semibold text-navy-600">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea id={id} name={f.name} defaultValue={String(f.defaultValue ?? "")} placeholder={f.placeholder} className="textarea text-sm" />
            ) : f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={String(f.defaultValue ?? "")} className="select py-2 text-sm">
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type ?? "text"}
                step={f.step}
                defaultValue={f.defaultValue === undefined ? undefined : String(f.defaultValue)}
                placeholder={f.placeholder}
                className="input py-2 text-sm"
              />
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-1">
        <button type="submit" disabled={busy} className="btn-primary py-2.5">
          {busy ? "Saving…" : submit}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">
          {error}
        </p>
      ) : null}
      {ok && done ? <p className="text-sm text-green-700 sm:col-span-2 lg:col-span-4">{done}</p> : null}
    </form>
  );
}

/** Remove one thing (a document, a phone message) after a confirmation. */
export function AdminDelete({ url, confirm, children = "Delete" }: { url: string; confirm: string; children?: ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm(confirm)) return;
        setBusy(true);
        try {
          await adminDelete(url);
          refreshAfterSave(router);
        } finally {
          setBusy(false);
        }
      }}
      className="text-xs font-semibold text-red-600 hover:underline"
    >
      {busy ? "…" : children}
    </button>
  );
}
