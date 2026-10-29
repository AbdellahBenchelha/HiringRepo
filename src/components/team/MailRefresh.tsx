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
        className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brand-100 disabled:opacity-70"
      >
        <Icon name="rotate" className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
        {checking ? "Checking…" : "Refresh"}
      </button>
    </span>
  );
}
