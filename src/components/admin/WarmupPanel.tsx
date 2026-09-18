"use client";

import { useState } from "react";
import { adminPost } from "@/lib/adminClient";
import { Icon, type IconName } from "@/components/Icon";
import {
  MIN_DAYS_PER_STAGE,
  WARMUP_STAGES,
  WARMUP_TIME_ZONE,
  type VerdictLevel,
} from "@/lib/warmup";
import type { WarmupStats } from "@/lib/warmupStats";

/**
 * The warm-up tab.
 *
 * Three things: what is left today, whether to send more tomorrow, and the cap
 * itself. Per-message reporting is deliberately absent — ZeptoMail already
 * keeps it, and a second copy here would be one more thing to keep honest for
 * no gain. The numbers that remain are the ones a decision is made from.
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

export function WarmupPanel({ initial }: { initial: WarmupStats }) {
  const [stats, setStats] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [capDraft, setCapDraft] = useState(String(initial.config.dailyCap));
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

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
      setConfirmClear(false);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const { allowance, verdict, stage, next, recorded } = stats;
  const feedbackCount = recorded.bounced + recorded.softBounced + recorded.complained;
  const pct = allowance.cap > 0 ? Math.min(100, (allowance.used / allowance.cap) * 100) : 0;
  const overCap = Math.max(0, allowance.used - allowance.cap);
  const style = VERDICT_STYLE[verdict.level];

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

            {/* Sits with the verdict because it is the verdict it undermines:
                with nothing reporting bounces, the two figures this is decided
                on are stuck at zero and every answer looks like good news. */}
            {!stats.feedbackConfigured ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
                <strong className="font-semibold">
                  Bounces and complaints are not being reported.
                </strong>{" "}
                This verdict is being decided on figures that will stay at zero, so it will look
                healthier than it is. Set{" "}
                <code className="rounded bg-white/70 px-1 py-0.5 text-xs">
                  EMAIL_FEEDBACK_SECRET
                </code>{" "}
                in the environment, then add a webhook in the ZeptoMail console pointing at{" "}
                <code className="rounded bg-white/70 px-1 py-0.5 text-xs">
                  /api/email-feedback?k=&lt;that secret&gt;
                </code>
                .
              </div>
            ) : null}

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
      {/* What the verdict was computed from                               */}
      {/* ---------------------------------------------------------------- */}
      {/* Shown only when there is something recorded, because its whole job
          is to be reconcilable against ZeptoMail. A tab asserting a bounce
          rate while giving no way to see the count behind it, or to correct
          it, is a tab you cannot argue with — which matters, because the
          first version of the webhook counted the return-path address in
          every payload as a bounce and held the verdict at "stop" over
          messages that never bounced. */}
      {feedbackCount > 0 ? (
        <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-400">
            What the verdict was computed from
          </h2>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt className="text-navy-400">Sent</dt>
              <dd className="text-lg font-semibold tabular-nums text-navy-900">{recorded.sent}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Hard bounces</dt>
              <dd className="text-lg font-semibold tabular-nums text-navy-900">
                {recorded.bounced}
              </dd>
            </div>
            <div>
              <dt className="text-navy-400">Soft bounces</dt>
              <dd className="text-lg font-semibold tabular-nums text-navy-500">
                {recorded.softBounced}
              </dd>
            </div>
            <div>
              <dt className="text-navy-400">Complaints</dt>
              <dd className="text-lg font-semibold tabular-nums text-navy-900">
                {recorded.complained}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-navy-500">
            Only hard bounces and complaints decide the verdict. Soft bounces — a full mailbox, a
            receiving server having a bad afternoon — are counted here and left out of it, because
            the 2% and 5% lines are hard-bounce lines.
          </p>

          <p className="mt-4 text-sm text-navy-600">
            <strong className="font-semibold text-navy-800">
              ZeptoMail&rsquo;s own reporting is the truth.
            </strong>{" "}
            If these do not match what the console shows for the last fortnight, clear them — the
            verdict is being decided on numbers that are wrong, and they would otherwise sit in the
            window for two weeks holding sending back.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {confirmClear ? (
              <>
                <span className="text-sm text-navy-700">
                  Forget all {feedbackCount} recorded {feedbackCount === 1 ? "event" : "events"}?
                  Sends are kept.
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ action: "clearFeedback" })}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Yes, clear them
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmClear(false)}
                  className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmClear(true)}
                className="rounded-xl border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
              >
                Clear recorded bounces and complaints
              </button>
            )}
          </div>
        </section>
      ) : null}

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
