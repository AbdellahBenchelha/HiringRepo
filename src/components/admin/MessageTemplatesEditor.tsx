"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { MessagePreview } from "@/components/admin/MessagePreview";
import {
  LENGTH_HARD_LIMIT,
  LENGTH_MAX,
  LENGTH_SOFT_LIMIT,
  PLACEHOLDERS,
  TEMPLATE_KEYS,
  TEMPLATE_META,
  unknownPlaceholders,
  type MessageTemplates,
  type TemplateKey,
  type TemplateVars,
} from "@/lib/messageTemplates";

export interface PreviewSample {
  id: string;
  label: string;
  vars: TemplateVars;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function MessageTemplatesEditor({
  initial,
  samples,
}: {
  initial: MessageTemplates;
  samples: PreviewSample[];
}) {
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const sample = samples.find((s) => s.id === sampleId) ?? samples[0];
  const [dirtyKeys, setDirtyKeys] = useState<Record<string, boolean>>({});

  // Leaving with an unsaved template loses the wording with no way back.
  const anyDirty = Object.values(dirtyKeys).some(Boolean);
  useEffect(() => {
    if (!anyDirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [anyDirty]);

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="preview-as" className="text-sm font-semibold text-navy-700">
          Preview as
        </label>
        <select
          id="preview-as"
          value={sampleId}
          onChange={(e) => setSampleId(e.target.value)}
          className="select !w-auto !py-1.5 text-sm"
        >
          {samples.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <p className="text-xs text-navy-500">
          Every preview below is filled in with this candidate&rsquo;s details.
        </p>
      </div>

      {TEMPLATE_KEYS.map((key) => (
        <TemplateCard
          key={key}
          tkey={key}
          initial={initial[key]}
          vars={sample?.vars}
          onDirtyChange={(d) => setDirtyKeys((prev) => (prev[key] === d ? prev : { ...prev, [key]: d }))}
        />
      ))}
    </div>
  );
}

function TemplateCard({
  tkey,
  initial,
  vars,
  onDirtyChange,
}: {
  tkey: TemplateKey;
  initial: MessageTemplates[TemplateKey];
  vars?: TemplateVars;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const meta = TEMPLATE_META[tkey];
  const [body, setBody] = useState(initial.body);
  const [saved, setSaved] = useState(initial.body);
  const [isDefault, setIsDefault] = useState(initial.isDefault);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const dirty = body !== saved;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Grow the box to fit the message, so a short one is not left floating in a
  // tall empty field and a long one needs no inner scrolling. Measured rather
  // than counted: these paragraphs wrap, so line breaks alone under-count.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 700)}px`;
  }, [body]);

  const unknown = useMemo(() => unknownPlaceholders(body), [body]);
  const empty = !body.trim();
  const blocked = empty || unknown.length > 0;

  /** Insert a placeholder where the cursor is, not at the end. */
  function insert(name: string) {
    const el = ref.current;
    const token = `{{${name}}}`;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? start;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    // Put the caret after the inserted token once React has repainted.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save(reset = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setJustSaved(false);
    try {
      const res = await adminPost("/api/admin/messages", reset ? { key: tkey, reset: true } : { key: tkey, body });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string[];
        templates?: MessageTemplates;
      };
      if (data.ok && data.templates) {
        const next = data.templates[tkey];
        setBody(next.body);
        setSaved(next.body);
        setIsDefault(next.isDefault);
        setUpdatedAt(next.updatedAt);
        setJustSaved(true);
        window.setTimeout(() => setJustSaved(false), 4000);
      } else {
        setError(
          data.error === "unknown_placeholder"
            ? `Unknown placeholder: ${(data.detail ?? []).map((d) => `{{${d}}}`).join(", ")}`
            : data.error === "empty"
              ? "The message cannot be empty."
              : data.error === "too_long"
                ? `The message is longer than ${LENGTH_MAX} characters.`
                : data.error === "unauthorized"
                  ? "Your session expired. Sign in again."
                  : `Could not save (${data.error ?? "unknown"}).`,
        );
      }
    } catch {
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  const len = body.length;
  const lenClass =
    len > LENGTH_HARD_LIMIT ? "text-red-600" : len > LENGTH_SOFT_LIMIT ? "text-amber-600" : "text-navy-400";

  return (
    <section className="card p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-navy-900">{meta.label}</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-navy-500">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Unsaved changes
            </span>
          ) : justSaved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              <Icon name="checkCircle" className="h-3.5 w-3.5" /> Saved
            </span>
          ) : isDefault ? (
            <span className="rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-500">
              Default wording
            </span>
          ) : (
            <span className="text-xs text-navy-400">Edited {fmtDate(updatedAt)}</span>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editor */}
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-navy-400">Insert</span>
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => insert(p.name)}
                title={`${p.label} — e.g. ${p.example}`}
                className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 font-mono text-[11px] font-semibold text-brand-800 transition hover:bg-brand-100"
              >
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            ref={ref}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={LENGTH_MAX}
            spellCheck
            rows={7}
            aria-label={`${meta.label} message`}
            className="w-full rounded-xl border border-navy-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-navy-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs ${lenClass}`}>
              {len} characters
              {len > LENGTH_HARD_LIMIT
                ? " — too long for a reliable WhatsApp link"
                : len > LENGTH_SOFT_LIMIT
                  ? " — getting long for a WhatsApp link"
                  : ""}
            </span>
            {/* Reverts the box to the last saved wording. Going all the way
                back to the built-in text is "Reset to default" below, which
                also clears the saved copy. */}
            <button
              type="button"
              onClick={() => setBody(saved)}
              disabled={!dirty}
              className="text-xs font-semibold text-navy-500 underline-offset-2 hover:text-navy-800 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo my changes
            </button>
          </div>

          {unknown.length ? (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {unknown.map((u) => `{{${u}}}`).join(", ")} {unknown.length === 1 ? "is not a" : "are not"} placeholder
              {unknown.length === 1 ? "" : "s"} — the candidate would receive the braces as written. Use the buttons
              above, or delete it.
            </p>
          ) : null}
          {empty ? (
            <p className="mt-2 text-xs font-medium text-red-600">The message cannot be empty.</p>
          ) : null}
        </div>

        {/* Preview */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
            What the candidate receives
          </p>
          {vars ? (
            <MessagePreview body={body} vars={vars} />
          ) : (
            <p className="rounded-xl border border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">
              No candidates yet to preview against.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-4">
        <button
          type="button"
          onClick={() => save(false)}
          disabled={busy || blocked || !dirty}
          className="btn-primary !px-5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save message"}
        </button>
        {!isDefault ? (
          <button
            type="button"
            onClick={() => save(true)}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy-600 transition hover:bg-navy-100 disabled:opacity-50"
          >
            Reset to default
          </button>
        ) : null}
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
