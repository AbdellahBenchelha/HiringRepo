"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";

/**
 * Whether Telegram stays quiet about applicants who owe an identity check.
 *
 * Saves on toggle rather than behind a button: it is one boolean, and a Save
 * button for a single switch is a step that exists only to be forgotten. The
 * previous value is put back if the request fails, so the switch never shows a
 * state the server did not accept.
 */
export function QuietNotificationsToggle({
  initial,
  updatedAt,
}: {
  initial: boolean;
  updatedAt?: string;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(updatedAt);

  async function toggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    setOn(next);
    try {
      const res = await adminPost("/api/admin/notification-settings", {
        quietUntilAssessment: next,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; settings?: { updatedAt?: string } };
      if (data.ok) {
        setSavedAt(data.settings?.updatedAt);
      } else {
        setOn(!next);
        setError(`Could not save (${data.error ?? "unknown"}).`);
      }
    } catch {
      setOn(!next);
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-navy-900">Telegram notifications</h2>
          <p className="mt-0.5 text-sm text-navy-500">
            Candidates from the countries above generate three messages: a new application, a
            submitted form, and their assessment result. Turn this on to receive only the last.
          </p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span className="text-sm font-semibold text-navy-800">{on ? "Quiet" : "All messages"}</span>
          <span className="relative inline-flex">
            <input
              type="checkbox"
              checked={on}
              disabled={busy}
              onChange={(e) => toggle(e.target.checked)}
              className="peer sr-only"
              aria-label="Only notify me when these candidates complete the assessment"
            />
            <span className="h-6 w-11 rounded-full bg-navy-200 transition peer-checked:bg-brand-500 peer-disabled:opacity-50" />
            <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-navy-100 bg-navy-50/40 p-4 text-sm leading-relaxed text-navy-600">
        {on ? (
          <>
            <p className="flex items-start gap-2 font-medium text-navy-800">
              <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              You will hear about these candidates only once they finish the assessment.
            </p>
            <p className="mt-2">
              Their applications are still saved and still appear under Candidates — only the
              Telegram message is held back. Everyone from every other country is unaffected.
            </p>
          </>
        ) : (
          <p>
            Every application sends a message, whatever the country. This is the default.
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        {!error && savedAt ? (
          <p className="text-xs text-navy-400">
            Changed{" "}
            {new Date(savedAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
