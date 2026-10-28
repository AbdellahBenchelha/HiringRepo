"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { teamPost } from "@/lib/teamClient";

/** Messages to the whole team, at the top of every page until dismissed. */
export function Announcements({
  items,
}: {
  items: { id: string; title: string; body: string; createdAt: string }[];
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const shown = items.filter((a) => !hidden.includes(a.id));
  if (!shown.length) return null;

  function dismiss(id: string) {
    setHidden((h) => [...h, id]);
    void teamPost("/api/team/account", { action: "dismiss_announcement", id }).catch(() => {});
  }

  return (
    <div className="mb-6 space-y-3">
      {shown.map((a) => (
        <div
          key={a.id}
          data-announcement
          className="flex gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-navy-800"
        >
          <Icon name="megaphone" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-navy-900">{a.title}</p>
            {a.body ? <p className="mt-1 whitespace-pre-line text-sm">{a.body}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(a.id)}
            className="shrink-0 self-start rounded-lg p-1 text-navy-400 hover:bg-white hover:text-navy-700"
            aria-label="Hide this announcement"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
