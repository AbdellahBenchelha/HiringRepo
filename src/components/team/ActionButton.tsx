"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { problemOf, teamPost } from "@/lib/teamClient";
import { refreshAfterSave } from "@/lib/refreshAfterSave";

/**
 * One button that posts one thing to the portal's API, then refreshes the
 * page so it shows the result. Says what went wrong if it did not work.
 */
export function ActionButton({
  url,
  body,
  children,
  className = "btn-primary",
  confirm,
  after,
}: {
  url: string;
  body: unknown;
  children: ReactNode;
  className?: string;
  confirm?: string;
  /** Go here afterwards instead of refreshing. */
  after?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    try {
      const res = await teamPost(url, body);
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      if (after) router.replace(after);
      refreshAfterSave(router);
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={run} disabled={busy} className={className}>
        {busy ? "Please wait…" : children}
      </button>
      {error ? (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </span>
  );
}
