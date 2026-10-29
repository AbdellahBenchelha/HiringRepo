"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** The member's address with a one-click copy icon, at the top of the mailbox. */
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
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1 break-all text-sm font-semibold leading-snug text-navy-900" data-mail-address>
        {address}
      </span>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied" : "Copy address"}
        aria-label={copied ? "Address copied" : "Copy address"}
        className={`shrink-0 rounded-lg p-1.5 transition ${copied ? "text-green-700" : "text-navy-400 hover:bg-cream-200 hover:text-navy-900"}`}
        data-copy-address
      >
        <Icon name={copied ? "check" : "copy"} className="h-4 w-4" />
      </button>
    </span>
  );
}
