"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  DEFAULT_PACE_SECONDS,
  MAX_BATCH,
  PACE_OPTIONS,
  eligibility,
  type BatchState,
} from "@/lib/bulkEmail";
import {
  advertisedFor,
  belowAdvertised,
  formatRate,
  offerProblems,
  type Offer,
} from "@/lib/offer";
import { MAX_HOURS_PER_WEEK } from "@/lib/availability";
import type { CandidateView } from "@/lib/candidateView";

/**
 * Writing a group of offers at once.
 *
 * Every other bulk action sends one message to everybody. An offer does not:
 * the whole content of it is a figure that belongs to one person, so this is a
 * table of terms rather than a confirmation box, and each row is filled in
 * before anything is sent.
 *
 * What is deliberately not here: engagement type and start date. Both are
 * fixed for the batch — independent contractor, no date quoted — because they
 * are the two things a candidate would ring up about, and a column of them
 * across forty rows is forty chances to send somebody else's answer. Anyone
 * who needs different terms gets their offer from their own profile, where the
 * full form is.
 *
 * Nothing is decided here that the server does not decide again. The rows are
 * eligible when the editor opens; the eligibility runs a second time at send
 * time against the record on disk, which is the one that counts.
 */

/** One person's terms, as they are being typed. */
interface Draft {
  position: string;
  rate?: number;
  currency: string;
  unit: Offer["unit"];
  hoursPerWeek?: number;
}

/**
 * The whole batch is contractor work with no date quoted, and the email says
 * so. Held here as a constant rather than a field so that it reads the same in
 * the confirmation, in the email, and in the stored record.
 */
const ENGAGEMENT: Offer["engagement"] = "Independent contractor";

/**
 * Currencies offered in the dropdown.
 *
 * A list rather than a text box: "usd", "US$" and a stray space all validate
 * as a currency and then throw inside Intl when the email is formatted. A
 * candidate's own advertised currency is added to the list if it is not here.
 */
const CURRENCIES = ["USD", "EUR", "GBP", "MAD", "NGN"];

const UNITS: { value: Offer["unit"]; label: string }[] = [
  { value: "HOUR", label: "per hour" },
  { value: "DAY", label: "per day" },
  { value: "WEEK", label: "per week" },
  { value: "MONTH", label: "per month" },
  { value: "YEAR", label: "per year" },
];

/** What this person's role advertises, which is where their row starts. */
function draftFor(c: CandidateView): Draft {
  const advertised = advertisedFor(c.position);
  return {
    position: c.position || "",
    // The bottom of the published band. It is the figure that was promised,
    // and the one that is right more often than any other guess.
    rate: advertised?.min,
    currency: advertised?.currency ?? "USD",
    unit: advertised?.unit ?? "HOUR",
    // Five days of up to five hours — the schedule everybody is offered.
    hoursPerWeek: MAX_HOURS_PER_WEEK,
  };
}

function toOffer(d: Draft): Offer {
  return {
    position: d.position.trim(),
    rate: d.rate ?? 0,
    currency: d.currency,
    unit: d.unit,
    hoursPerWeek: d.hoursPerWeek,
    engagement: ENGAGEMENT,
  };
}

interface Skipped {
  name: string;
  reason: string;
}

export function useBulkOffer(
  /** Everyone the filters left, in the order shown. */
  candidates: CandidateView[],
  selected: string[],
  clearSelection: () => void,
  /**
   * Tell the bar a batch has begun.
   *
   * The progress panel belongs to the selection bar, and it polls — without
   * this it would take a few seconds to notice, which reads as the button
   * having done nothing.
   */
  onStarted: () => void,
) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pace, setPace] = useState<number>(DEFAULT_PACE_SECONDS);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  /** Who can be offered, and who cannot, worked out from what is on screen. */
  const plan = useMemo(() => {
    const include: CandidateView[] = [];
    const skip: Skipped[] = [];
    for (const id of selected) {
      const c = byId.get(id);
      if (!c) continue;
      const verdict = eligibility("offer", {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        offerSentAt: c.offerSentAt,
        voiceStatusForOffer: c.voiceStatus,
      });
      if (verdict.include) include.push(c);
      else skip.push({ name: c.fullName || c.email || c.id, reason: verdict.reason });
    }
    return { include, skip };
  }, [selected, byId]);

  function openEditor() {
    const next: Record<string, Draft> = {};
    for (const c of plan.include) next[c.id] = draftFor(c);
    setDrafts(next);
    setError("");
    setOpen(true);
  }

  function set<K extends keyof Draft>(id: string, key: K, value: Draft[K]) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  /** The first thing wrong with each row, by id — empty when the row is fine. */
  const problems = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of plan.include) {
      const d = drafts[c.id];
      if (!d) continue;
      const first = offerProblems(toOffer(d))[0];
      if (first) out[c.id] = first;
    }
    return out;
  }, [plan.include, drafts]);

  const ready = plan.include.length > 0 && Object.keys(problems).length === 0;
  const minutes = Math.max(1, Math.round((plan.include.length * pace) / 60));

  /** Rows promising less than the advert did. Said out loud, never blocked. */
  const lowCount = useMemo(
    () =>
      plan.include.filter((c) => {
        const d = drafts[c.id];
        return d && !problems[c.id] && belowAdvertised(toOffer(d));
      }).length,
    [plan.include, drafts, problems],
  );

  async function send() {
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    try {
      const offers: Record<string, Offer> = {};
      for (const c of plan.include) offers[c.id] = toOffer(drafts[c.id]);
      const res = await adminPost("/api/admin/bulk-email", {
        action: "offer",
        ids: plan.include.map((c) => c.id),
        offers,
        paceSeconds: pace,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; batch?: BatchState };
      if (data.ok) {
        setConfirming(false);
        setOpen(false);
        clearSelection();
        onStarted();
      } else if (data.error === "busy") {
        setError("A batch is already running. Wait for it to finish, or stop it first.");
        setConfirming(false);
      } else {
        setError(`Could not start (${data.error ?? "unknown"}).`);
        setConfirming(false);
      }
    } catch {
      setError("Could not start. Please try again.");
      setConfirming(false);
    }
    setBusy(false);
  }

  const button = (
    <button
      type="button"
      onClick={openEditor}
      disabled={selected.length > MAX_BATCH}
      className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-white px-3.5 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-100 disabled:opacity-40"
    >
      <Icon name="handshake" className="h-3.5 w-3.5" />
      Send offers
    </button>
  );

  const dialog = (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy-900/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Send offers"
        >
          <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-navy-900">
                  Send {plan.include.length} offer{plan.include.length === 1 ? "" : "s"}
                </h2>
                <p className="mt-0.5 text-xs text-navy-500">
                  Each row starts at the bottom of what that role advertises. Change anything you
                  agreed differently before sending.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-navy-500 transition hover:bg-navy-100"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {/* Said once, at the top, rather than repeated down two columns:
                  these two terms are the same for everybody in this batch. */}
              <p className="mb-4 rounded-xl border border-navy-100 bg-cream-50 px-4 py-3 text-xs text-navy-600">
                Every offer here goes out as an{" "}
                <strong className="font-semibold text-navy-800">independent contractor</strong>{" "}
                engagement with <strong className="font-semibold text-navy-800">no start date</strong>{" "}
                quoted. For anything else, send that person&rsquo;s offer from their own profile.
              </p>

              {plan.include.length === 0 ? (
                <p className="rounded-xl border border-navy-100 bg-navy-50 px-4 py-8 text-center text-sm text-navy-500">
                  Nobody selected can be offered yet.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-navy-100">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 bg-navy-50/60 text-xs uppercase tracking-wide text-navy-500">
                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Full name</th>
                        {/* Takes the slack, so the three narrow columns after
                            it sit together instead of drifting apart across a
                            wide screen. */}
                        <th className="w-full px-4 py-2.5 font-semibold">Position</th>
                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Rate</th>
                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">Per</th>
                        <th className="whitespace-nowrap px-4 py-2.5 font-semibold">
                          Hours per week
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-50">
                      {plan.include.map((c) => {
                        const d = drafts[c.id];
                        if (!d) return null;
                        const problem = problems[c.id];
                        const low = problem ? null : belowAdvertised(toOffer(d));
                        const currencies = CURRENCIES.includes(d.currency)
                          ? CURRENCIES
                          : [d.currency, ...CURRENCIES];
                        return (
                          <tr key={c.id} className="align-top">
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-navy-900">{c.fullName || "—"}</p>
                              {problem ? (
                                <p className="mt-0.5 text-xs font-semibold text-red-700">
                                  {problem}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                className="input !py-1.5 text-sm"
                                value={d.position}
                                onChange={(e) => set(c.id, "position", e.target.value)}
                                aria-label={`Position for ${c.fullName || c.id}`}
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  className="input !w-24 !py-1.5 text-sm"
                                  value={d.rate ?? ""}
                                  onChange={(e) =>
                                    set(
                                      c.id,
                                      "rate",
                                      e.target.value === "" ? undefined : Number(e.target.value),
                                    )
                                  }
                                  aria-label={`Rate for ${c.fullName || c.id}`}
                                />
                                <select
                                  className="select !w-auto !py-1.5 text-sm"
                                  value={d.currency}
                                  onChange={(e) => set(c.id, "currency", e.target.value)}
                                  aria-label={`Currency for ${c.fullName || c.id}`}
                                >
                                  {currencies.map((cur) => (
                                    <option key={cur} value={cur}>
                                      {cur}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* A warning, not a refusal: somebody who came
                                  through six stages on a published figure and
                                  is then offered less is the complaint that
                                  gets a company reported. */}
                              {low ? (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                  Below the{" "}
                                  {formatRate({
                                    rate: low.min,
                                    currency: low.currency,
                                    unit: low.unit,
                                  })}{" "}
                                  advertised.
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                className="select !w-auto !py-1.5 text-sm"
                                value={d.unit}
                                onChange={(e) =>
                                  set(c.id, "unit", e.target.value as Offer["unit"])
                                }
                                aria-label={`Rate period for ${c.fullName || c.id}`}
                              >
                                {UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>
                                    {u.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                min={1}
                                max={168}
                                className="input !w-24 !py-1.5 text-sm"
                                value={d.hoursPerWeek ?? ""}
                                onChange={(e) =>
                                  set(
                                    c.id,
                                    "hoursPerWeek",
                                    e.target.value === "" ? undefined : Number(e.target.value),
                                  )
                                }
                                aria-label={`Hours per week for ${c.fullName || c.id}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Who was ticked and is not getting one, with the reason. A
                  count that quietly shrank is the thing nobody can check. */}
              {plan.skip.length ? (
                <div className="mt-4 rounded-xl border border-navy-200 bg-navy-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-navy-600">
                    Not being offered
                  </p>
                  <ul className="mt-1.5 space-y-1 text-xs text-navy-600">
                    {plan.skip.map((s) => (
                      <li key={s.name}>
                        <span className="font-semibold text-navy-800">{s.name}</span> — {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 bg-cream-50 px-5 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold text-navy-900">
                  {plan.include.length} ready
                  {Object.keys(problems).length ? (
                    <span className="font-semibold text-red-700">
                      {" "}
                      · {Object.keys(problems).length} to fix
                    </span>
                  ) : null}
                </p>
                <label className="flex items-center gap-2 text-xs font-bold text-navy-700">
                  How fast
                  <select
                    value={pace}
                    onChange={(e) => setPace(Number(e.target.value))}
                    className="select !w-auto !py-1.5 text-xs font-normal"
                    aria-label="How fast"
                  >
                    {PACE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} — {o.hint}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-navy-500">
                  About {minutes} minute{minutes === 1 ? "" : "s"} in all.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-3.5 py-2 text-xs font-semibold text-navy-600 transition hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={!ready || busy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-navy-800 disabled:opacity-40"
                >
                  <Icon name="handshake" className="h-3.5 w-3.5" />
                  Send {plan.include.length} offer{plan.include.length === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        icon="handshake"
        title={`Send ${plan.include.length} written offer${plan.include.length === 1 ? "" : "s"}?`}
        confirmLabel={busy ? "Starting…" : `Send ${plan.include.length}`}
        busy={busy}
        warning={
          lowCount
            ? `${lowCount} ${lowCount === 1 ? "offer is" : "offers are"} below what the role advertises.`
            : undefined
        }
        onCancel={() => setConfirming(false)}
        onConfirm={() => void send()}
        body={
          <p>
            Each person gets their own terms, one email at a time, about {pace} seconds apart —
            roughly {minutes} minute{minutes === 1 ? "" : "s"} in all. The sending happens on the
            server, so you can close this tab. An offer cannot be unsent.
          </p>
        }
      />
    </>
  );

  return { button, dialog };
}
