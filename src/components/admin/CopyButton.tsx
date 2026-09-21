"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Copy a block of text, and say that it worked.
 *
 * The confirmation is the whole feature. A copy button that looks identical
 * before and after leaves you pasting somewhere else to find out whether it
 * took — and pressing it again when it did, which on a slow machine is how you
 * end up with the clipboard holding whatever the second press grabbed.
 *
 * Two ways of doing it, because `navigator.clipboard` exists only in a secure
 * context. Over HTTPS, or on localhost, the modern API is used. Reached over
 * plain HTTP on an IP address — which is how somebody eventually opens the
 * Admin Panel from another machine on their network — it is simply not there,
 * and without the fallback the button would do nothing at all and say nothing
 * about why.
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  title,
  className = "",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  /** What is being copied, for the tooltip and the screen reader. */
  title?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function settle(next: "copied" | "failed") {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        settle("copied");
        return;
      }
      throw new Error("no clipboard api");
    } catch {
      // The old way: a textarea off-screen, selected and copied. Deprecated
      // and still the only thing that works without a secure context.
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-1000px";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        settle(ok ? "copied" : "failed");
      } catch {
        settle("failed");
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={
        state === "failed"
          ? "Could not copy — select the details and copy them by hand"
          : (title ?? label)
      }
      aria-label={title ?? label}
      // Announced when it changes, so the confirmation is not only a colour.
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
        state === "copied"
          ? "border-green-300 bg-green-50 text-green-700"
          : state === "failed"
            ? "border-red-300 bg-red-50 text-red-700"
            : "border-navy-200 bg-white text-navy-600 hover:bg-navy-50 hover:text-navy-900"
      } ${className}`}
    >
      <Icon
        name={state === "copied" ? "checkCircle" : "document"}
        className="h-3.5 w-3.5"
      />
      {state === "copied" ? copiedLabel : state === "failed" ? "Could not copy" : label}
    </button>
  );
}
