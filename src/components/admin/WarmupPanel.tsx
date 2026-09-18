"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { MIN_DAYS_PER_STAGE, WARMUP_STAGES, WARMUP_TIME_ZONE } from "@/lib/warmup";
import type { WarmupStats } from "@/lib/warmupStats";

/**
 * The warm-up tab.
 *
 * Two things: how much may still go out today, and how much has gone out
 * lately. Nothing about bounces, complaints or opens — ZeptoMail reports all
 * of that, and it did not need a second, shakier copy here.
 */

/**
 * The reset time, in London, whatever the browser's own clock is set to.
 *
 * The timezone has to be named explicitly. Formatting with the viewer's local
 * zone and then labelling it "London time" is how a UTC browser renders
 * midnight in London as 11:00 PM and contradicts itself in the same sentence.
 */
function timeOf(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: WARMUP_TIME_ZONE,
    });
  } catch {
    return "midnight";
  }
}

/** One figure, with the period it covers under it. */
function Total({ label, value, quiet = false }: { label: string; value: number; quiet?: boolean }) {
  return (
    <div className="min-w-[5.5rem]">
      <p className={`text-2xl font-bold tabular-nums ${quiet ? "text-navy-500" : "text-navy-900"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
    </div>
  );
}

export function WarmupPanel({ initial }: { initial: WarmupStats }) {
  const [stats, setStats] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [capDraft, setCapDraft] = useState(String(initial.config.dailyCap));
  const [error, setError] = useState("");

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await adminPost("/api/admin/warmup", body);
      const data = (await res.json()) as { ok: boolean; stats?: WarmupStats; error?: string };
      if (!data.ok || !data.stats) {
        setError(
          data.error === "bad_cap" ? "That is not a number this will accept." : "That did not save.",
        );
        return;
      }
      setStats(data.stats);
      setCapDraft(String(data.stats.config.dailyCap));
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const { allowance, stage, next, totals } = stats;
  const pct = allowance.cap > 0 ? Math.min(100, (allowance.used / allowance.cap) * 100) : 0;
  const overCap = Math.max(0, allowance.used - allowance.cap);
  const heldLongEnough = stats.daysAtStage >= MIN_DAYS_PER_STAGE;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Today                                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Today</p>
            <p className="mt-1 text-3xl font-bold text-navy-900">
              {allowance.used}
              <span className="text-lg font-medium text-navy-400"> / {allowance.cap} sent</span>
            </p>
            <p className="mt-1 text-sm text-navy-500">
              {allowance.remaining > 0 ? (
                <>
                  <strong className="text-navy-700">{allowance.remaining}</strong> left. Resets at{" "}
                  {timeOf(allowance.resetsAt)} London time.
                </>
              ) : (
                <>
                  Today&rsquo;s allowance is spent. It resets at {timeOf(allowance.resetsAt)} London
                  time, and any running batch picks itself up then.
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Stage</p>
            <p className="mt-1 text-lg font-semibold text-navy-900">{stage.label}</p>
            <p className="text-sm text-navy-500">day {stats.daysAtStage} at this volume</p>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className={`h-full rounded-full transition-all ${
              allowance.remaining === 0 ? "bg-amber-500" : "bg-brand-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-navy-400">{stage.note}</p>
        {overCap > 0 ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {overCap} sent past the cap today by override.
          </p>
        ) : null}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How much has gone out                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          Messages sent
        </h2>
        <div className="mt-4 flex flex-wrap gap-x-10 gap-y-5">
          <Total label="Today" value={totals.today} />
          <Total label="Yesterday" value={totals.yesterday} />
          <Total label="Last 7 days" value={totals.last7} />
          <Total label="This month" value={totals.thisMonth} />
          <Total label="Last month" value={totals.lastMonth} quiet />
        </div>
        {/* Said plainly, because a count of sends looks like a delivery figure
            and is not one: this is what left, not what arrived. */}
        <p className="mt-4 text-xs text-navy-400">
          Everything accepted by ZeptoMail, campaign and automatic mail together. Counted by day in
          London. What happened to those messages after they left — delivered, opened, bounced — is
          in ZeptoMail&rsquo;s own reports.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The cap                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          The daily cap
        </h2>
        <p className="mt-2 text-sm text-navy-500">
          The stages below are the usual ramp. They are only defaults — a list that is bouncing
          wants another week at the same volume, not the next rung.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-navy-700">Messages per day</span>
            <input
              type="number"
              min={1}
              value={capDraft}
              onChange={(e) => setCapDraft(e.target.value)}
              className="w-32 rounded-xl border border-navy-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy || capDraft === String(stats.config.dailyCap)}
            onClick={() => act({ action: "setCap", cap: Number(capDraft) })}
            className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-40"
          >
            Save
          </button>
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>

        {/* A hand-set cap deliberately leaves the stage alone, so the
            highlighted row below can disagree with the number in the box.
            Said out loud, because otherwise it just looks wrong. */}
        {stats.config.dailyCap !== stage.cap ? (
          <p className="mt-2 text-xs text-navy-500">
            Set by hand, so it differs from {stage.label}&rsquo;s usual {stage.cap}. Stepping up or
            down puts it back on the curve.
          </p>
        ) : null}

        <ol className="mt-5 space-y-1 text-sm">
          {WARMUP_STAGES.map((s, i) => (
            <li
              key={s.label}
              className={`flex items-baseline justify-between gap-4 rounded-lg px-3 py-2 ${
                i === stats.stageIndex ? "bg-brand-50 font-semibold text-navy-900" : "text-navy-500"
              }`}
            >
              <span>{s.label}</span>
              <span className="tabular-nums">{s.cap}/day</span>
            </li>
          ))}
        </ol>

        {/* Moved here from the health box that used to gate it. The wait is
            still the point — providers read consistency over days — so the
            button appears on the day the stage has been held long enough,
            and until then the row says how far off it is. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {next && heldLongEnough ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ action: "stepUp" })}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              Step up to {next.label} — {next.cap}/day
            </button>
          ) : null}
          {stats.stageIndex > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ action: "stepDown" })}
              className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
            >
              Drop back a stage
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-navy-400">
          {next && !heldLongEnough ? (
            <>
              Day {stats.daysAtStage} of {MIN_DAYS_PER_STAGE} at this volume. {next.label} is
              offered once the stage has been held that long — providers read consistency over
              days, so the wait is doing the work.
            </>
          ) : next ? (
            <>
              A stage is held for at least {MIN_DAYS_PER_STAGE} days before the next is offered.
              Providers read consistency over days, so the wait is doing the work.
            </>
          ) : (
            <>Fully warmed — there is no higher stage.</>
          )}
        </p>
      </section>
    </div>
  );
}
