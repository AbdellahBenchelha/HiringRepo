"use client";

import { useEffect, useRef } from "react";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Confirmation dialog for admin actions that reach a candidate or destroy data.
 *
 * Replaces window.confirm, which cannot show who the action affects, cannot be
 * styled, and is suppressed entirely by some browsers after a few uses — which
 * would silently turn a guarded action into an unguarded one.
 *
 * Every message names the candidate. "Are you sure?" on the wrong row is how
 * the wrong person gets emailed or erased.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  warning,
  confirmLabel,
  tone = "default",
  icon,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  /** Extra caution shown above the buttons, e.g. an action repeated too soon. */
  warning?: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  icon?: IconName;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and the confirm button takes focus so the dialog can be
  // completed from the keyboard.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const danger = tone === "danger";

  return (
    <div
      // Above the candidate profile modal, which sits at z-50.
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-card sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"
            }`}
          >
            <Icon name={icon ?? (danger ? "trash" : "mail")} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-navy-900">{title}</h3>
            <div className="mt-1.5 text-sm leading-relaxed text-navy-600">{body}</div>
          </div>
        </div>

        {warning ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800">
            {warning}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-cream-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-5 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand-500 text-navy-900 hover:bg-brand-400"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
