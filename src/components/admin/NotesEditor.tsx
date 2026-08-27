"use client";

import { useEffect, useState } from "react";
import { adminPost } from "@/lib/adminClient";

/**
 * Recruiter notes on a candidate.
 *
 * Saved explicitly rather than on every keystroke: each write rewrites the
 * whole candidate file, so autosaving mid-sentence would rewrite it once per
 * character typed.
 */
export function NotesEditor({
  id,
  initial,
  onSaved,
}: {
  id: string;
  initial: string;
  onSaved: (notes: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Switching candidate must not carry the previous one's notes across.
  useEffect(() => {
    setValue(initial);
    setState("idle");
  }, [id, initial]);

  async function save() {
    setState("saving");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/notes`, { notes: value });
      if (res.ok) {
        setState("saved");
        onSaved(value);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  const dirty = value !== initial;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <label htmlFor={`notes-${id}`} className="text-sm font-semibold text-navy-800">
          Recruiter notes
        </label>
        {state === "saved" && !dirty ? (
          <span className="text-xs font-semibold text-green-700">Saved</span>
        ) : null}
        {state === "error" ? (
          <span className="text-xs font-semibold text-red-600">Could not save</span>
        ) : null}
      </div>
      <textarea
        id={`notes-${id}`}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        rows={3}
        placeholder="Call outcomes, availability, anything worth remembering…"
        className="textarea mt-2 !min-h-[5rem]"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
      </div>
    </div>
  );
}
