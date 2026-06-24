"use client";

import { useCallback, useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";
import { ApplicationForm } from "@/components/forms/ApplicationForm";

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  position?: string;
}

/**
 * Accessible full-screen application modal.
 * - role="dialog" + aria-modal, labelled by the heading.
 * - Focus is moved in on open and restored on close.
 * - Escape closes; focus is trapped within the dialog (basic Tab cycling).
 * - Background scroll is locked while open.
 */
export function ApplicationModal({ isOpen, onClose, position }: ApplicationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    // Move focus into the dialog.
    const t = window.setTimeout(() => {
      const heading = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      heading?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-start sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-modal-title"
        className="relative flex h-full w-full max-w-4xl flex-col bg-white shadow-card sm:my-4 sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-navy-100 bg-white px-5 py-4 sm:rounded-t-2xl sm:px-7">
          <h2
            id="application-modal-title"
            tabIndex={-1}
            data-autofocus
            className="text-lg font-semibold sm:text-xl"
          >
            Apply to NexaCare Support Solutions
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-navy-500 transition hover:bg-navy-50 hover:text-navy-900"
            aria-label="Close application form"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-6 sm:px-7">
          <ApplicationForm initialPosition={position} onSubmitted={() => undefined} />
        </div>
      </div>
    </div>
  );
}
