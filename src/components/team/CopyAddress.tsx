"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** The member's address with a one-click copy, for the mailbox header. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the address stays selectable as text.
    }
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="truncate text-sm text-navy-100" data-mail-address>
        {address}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-brand-300 transition hover:bg-white/10 hover:text-brand-200"
        aria-label={copied ? "Address copied" : "Copy address"}
      >
        <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </button>
    </span>
  );
}
