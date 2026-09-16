"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { Icon, type IconName } from "@/components/Icon";
import {
  BOUNCE_WARN,
  COMPLAINT_WARN,
  MIN_DAYS_PER_STAGE,
  percent,
  WARMUP_STAGES,
  WARMUP_TIME_ZONE,
  type VerdictLevel,
} from "@/lib/warmup";
import type { WarmupStats } from "@/lib/warmupStats";

/**
 * The warm-up tab.
 *
 * Built around one sentence — whether to send more tomorrow than today — with
 * the numbers underneath it as the reason. A page of statistics that leaves
 * the reader to work out what to do with them is a page nobody opens twice.
 */

const VERDICT_STYLE: Record<VerdictLevel, { box: string; icon: IconName; tint: string }> = {
  ramp: { box: "border-green-200 bg-green-50", icon: "checkCircle", tint: "text-green-700" },
  hold: { box: "border-amber-200 bg-amber-50", icon: "clock", tint: "text-amber-700" },
  stop: { box: "border-red-200 bg-red-50", icon: "shield", tint: "text-red-700" },
  unknown: { box: "border-navy-200 bg-navy-50", icon: "search", tint: "text-navy-600" },
};

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

function dayLabel(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : d.toLocaleDateString([], { day: "numeric", month: "short" });
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
        setError(data.error === "bad_cap" ? "That is not a number this will accept." : "That did not save.");
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

  const { allowance, window: win, verdict, stage, next } = stats;
  const used = Math.min(allowance.used, allowance.cap);
  const pct = allowance.cap > 0 ? Math.min(100, (allowance.used / allowance.cap) * 100) : 0;
  const style = VERDICT_STYLE[verdict.level];
  // The tallest bar in the chart sets the scale; a flat 0 would divide by zero.
  const peak = Math.max(1, ...stats.chart.map((d) => Math.max(d.sent, d.bounced)));

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
            <p className="text-sm text-navy-500">
              day {stats.daysAtStage} at this volume
            </p>
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
        {used !== allowance.used ? (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {allowance.used - allowance.cap} sent past the cap today by override.
          </p>
        ) : null}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The verdict                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className={`rounded-2xl border p-5 ${style.box}`}>
        <div className="flex items-start gap-3">
          <Icon name={style.icon} className={`mt-0.5 h-6 w-6 shrink-0 ${style.tint}`} />
          <div className="min-w-0 flex-1">
            <h2 className={`text-lg font-bold ${style.tint}`}>{verdict.headline}</h2>
            <ul className="mt-2 space-y-1 text-sm text-navy-700">
              {verdict.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              {verdict.level === "ramp" && next ? (
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
            {verdict.level === "ramp" && !next ? (
              <p className="mt-3 text-sm text-navy-600">
                Fully warmed — there is no higher stage. Keep an eye on bounces anyway.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Health                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          Last {win.days} days
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-navy-400">Messages sent</dt>
            <dd className="text-2xl font-bold text-navy-900">{win.sent}</dd>
            <p className="text-xs text-navy-400">{win.reactive} were replies to an application</p>
          </div>
          <div>
            <dt className="text-xs text-navy-400">Bounced</dt>
            <dd
              className={`text-2xl font-bold ${
                (win.bounceRate ?? 0) >= BOUNCE_WARN ? "text-red-700" : "text-navy-900"
              }`}
            >
              {percent(win.bounceRate)}
            </dd>
            <p className="text-xs text-navy-400">{win.bounced} of {win.sent} · keep under 2%</p>
          </div>
          <div>
            <dt className="text-xs text-navy-400">Marked as spam</dt>
            <dd
              className={`text-2xl font-bold ${
                (win.complaintRate ?? 0) >= COMPLAINT_WARN ? "text-red-700" : "text-navy-900"
              }`}
            >
              {percent(win.complaintRate, 2)}
            </dd>
            <p className="text-xs text-navy-400">{win.complained} of {win.sent} · keep under 0.1%</p>
          </div>
          <div>
            <dt className="text-xs text-navy-400">Opened something</dt>
            <dd className="text-2xl font-bold text-navy-900">{percent(stats.engagement)}</dd>
            <p className="text-xs text-navy-400">{stats.engagementOpeners} people · approximate</p>
          </div>
        </dl>

        {!stats.feedbackConfigured ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong className="font-semibold">Bounces and complaints are not being reported.</strong>{" "}
            Those two figures will stay at zero — and the verdict above will look healthier than it
            is — until ZeptoMail is told where to send them. Set{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 text-xs">EMAIL_FEEDBACK_SECRET</code> in
            the environment, then add a webhook in the ZeptoMail console pointing at{" "}
            <code className="rounded bg-white/70 px-1 py-0.5 text-xs">
              /api/email-feedback?k=&lt;that secret&gt;
            </code>
            .
          </div>
        ) : null}

        <p className="mt-4 text-xs text-navy-400">
          Sends, bounces and complaints are counted exactly. The open figure is approximate: opens
          are recorded against the person rather than the message, so they lag the send that caused
          them. It is still worth more than a typical open rate — these are real link clicks
          recorded on the server, not tracking pixels, so Apple and Gmail&rsquo;s image proxies
          cannot inflate it.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* The curve                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          Last {stats.chart.length} days
        </h2>
        {/* An all-zero chart draws as an empty box, which reads as broken
            rather than as "nothing has been sent". Said in words instead. */}
        {stats.chart.every((d) => d.sent === 0) ? (
          <p className="mt-4 rounded-xl border border-dashed border-navy-200 px-4 py-8 text-center text-sm text-navy-400">
            Nothing sent in the last {stats.chart.length} days. The curve appears here once it has
            something to draw.
          </p>
        ) : (
        <>
        <div className="mt-4 flex h-32 items-end gap-1">
          {stats.chart.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
              {d.bounced > 0 ? (
                <div
                  className="w-full rounded-t bg-red-400"
                  style={{ height: `${(d.bounced / peak) * 100}%` }}
                />
              ) : null}
              <div
                className={`w-full ${d.bounced > 0 ? "" : "rounded-t"} ${
                  d.overrides > 0 ? "bg-amber-400" : "bg-brand-400"
                }`}
                style={{ height: `${(d.sent / peak) * 100}%` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2 py-1 text-xs text-white group-hover:block">
                {dayLabel(d.day)}: {d.sent} sent
                {d.bounced ? `, ${d.bounced} bounced` : ""}
                {d.overrides ? `, ${d.overrides} over the cap` : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-navy-400">
          <span>{dayLabel(stats.chart[0]?.day ?? "")}</span>
          <span>today</span>
        </div>
        </>
        )}
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
        <p className="mt-3 text-xs text-navy-400">
          A stage is held for at least {MIN_DAYS_PER_STAGE} days before the next is offered.
          Providers read consistency over days, so the wait is doing the work.
        </p>
      </section>
    </div>
  );
}
