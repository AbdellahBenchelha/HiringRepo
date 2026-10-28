"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { csrfToken } from "@/lib/adminClient";

/** Share a PDF or image with one member; it shows on their Documents page. */
export function DocumentUpload({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/team/members/${memberId}/documents`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken() },
        body: new FormData(form),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { problems?: string[] };
        setError(d.problems?.[0] ?? "Could not upload.");
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("No connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor="doc-name" className="mb-1 block text-xs font-semibold text-navy-600">
          Name shown to the member
        </label>
        <input id="doc-name" name="name" className="input py-2 text-sm" placeholder="e.g. Signed contractor agreement" />
      </div>
      <div>
        <label htmlFor="doc-file" className="mb-1 block text-xs font-semibold text-navy-600">
          File (PDF or image, up to 10 MB)
        </label>
        <input id="doc-file" name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="block w-full text-sm" required />
      </div>
      <button type="submit" disabled={busy} className="btn-primary py-2.5">
        {busy ? "Uploading…" : "Share"}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-red-600 sm:col-span-3">
          {error}
        </p>
      ) : null}
    </form>
  );
}
