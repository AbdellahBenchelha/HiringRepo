"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

/**
 * Check for new mail: on the button at once, and by itself every 30 seconds
 * while the list is open.
 */
export function MailRefresh() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState("");

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  function refresh() {
    setChecking(true);
    router.refresh();
    // The refresh itself has no completion signal; a short spin reads as "checked".
    setTimeout(() => {
      setChecking(false);
      setCheckedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 900);
  }

  return (
    <span className="inline-flex items-center gap-2">
      {checkedAt ? (
        <span className="text-xs text-navy-400" role="status" data-mail-checked>
          Checked at {checkedAt}
        </span>
      ) : null}
      <button
        type="button"
        onClick={refresh}
        disabled={checking}
        data-mail-refresh
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-cream-300 bg-white px-3 text-sm font-semibold text-navy-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-70"
      >
        <Icon name="rotate" className={`h-4 w-4 text-brand-600 ${checking ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">{checking ? "Checking…" : "Refresh"}</span>
        <span className="sr-only sm:hidden">Refresh</span>
      </button>
    </span>
  );
}
