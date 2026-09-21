"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { Icon } from "@/components/Icon";

/**
 * The star beside a candidate's name.
 *
 * Optimistic: the star fills the instant it is pressed and only goes back if
 * the write fails. This is a one-bit change somebody makes while reading, and
 * a star that waits half a second to catch up invites a second press — which
 * would unstar the person who was just starred.
 *
 * Its own component because the star has to say which state it is in without
 * a label. Filled amber means marked; a grey outline-weight star means not.
 * Colour alone would be too quiet at this size, so the title and aria-label
 * say it in words as well.
 */
export function FavoriteButton({
  id,
  favorite,
  onChange,
}: {
  id: string;
  favorite: boolean;
  /** Reported up so the row behind the dialog moves in step. */
  onChange: (patch: { favorite: boolean; favoritedAt?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !favorite;
    setBusy(true);
    setFailed(false);
    // Shown as done before it is, and put back below if it was not.
    onChange({ favorite: next, favoritedAt: next ? new Date().toISOString() : undefined });
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/favorite`, { favorite: next });
      const data = (await res.json()) as {
        ok?: boolean;
        favorite?: boolean;
        favoritedAt?: string | null;
      };
      if (!data.ok) throw new Error("refused");
      onChange({ favorite: !!data.favorite, favoritedAt: data.favoritedAt ?? undefined });
    } catch {
      setFailed(true);
      onChange({ favorite, favoritedAt: undefined });
    } finally {
      setBusy(false);
    }
  }

  const label = favorite ? "Remove from favourites" : "Add to favourites";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={favorite}
      aria-label={label}
      title={failed ? "That did not save — press to try again" : label}
      className={`rounded-lg p-1.5 transition disabled:opacity-60 ${
        favorite
          ? "text-brand-500 hover:bg-brand-50"
          : "text-navy-300 hover:bg-navy-50 hover:text-navy-400"
      } ${failed ? "text-red-500" : ""}`}
    >
      <Icon name="star" className="h-5 w-5" />
    </button>
  );
}
