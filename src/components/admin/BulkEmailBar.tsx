"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  ACTION_LABEL,
  CANDIDATE_ACTIONS,
  DEFAULT_PACE_SECONDS,
  MAX_BATCH,
  PACE_OPTIONS,
  batchDuration,
  counts,
  eligibility,
  isFinished,
  type BatchState,
  type BulkAction,
} from "@/lib/bulkEmail";
import type { CandidateView } from "@/lib/candidateView";
import type { Allowance } from "@/lib/warmup";

/**
 * Emailing a group of candidates, one at a time.
 *
 * Two pieces returned separately, because they belong in different places: a
 * bar that appears above the table once anything is ticked, and a panel
 * showing the batch that is running. The panel outlives the selection — and
 * outlives the tab, since the sending happens on the server — so it is shown
 * whenever a batch exists, whether or not anything is selected now.
 *
 * Nothing is sent from the browser. The page starts a batch and then watches
 * it; closing the tab, or the laptop going to sleep, does not stop it.
 */

interface Skipped {
  name: string;
  reason: string;
}

function fmtTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** The icon each action wears, so the two buttons never look interchangeable. */
const ACTION_ICON: Record<BulkAction, "mail" | "clock" | "microphone" | "checkCircle" | "handshake"> = {
  assessment: "mail",
  reminder: "clock",
  voice: "microphone",
  voiceReminder: "clock",
  voiceAck: "checkCircle",
  offerReminder: "clock",
  offer: "handshake",
};

export function useBulkEmail(
  /** Everyone the filters left, in the order shown — not just this page. */
  candidates: CandidateView[],
  selected: string[],
  clearSelection: () => void,
  /**
   * Which actions this tab offers.
   *
   * The lists hold different people at different stages: the Candidates tab
   * chases an assessment nobody has sat, the Interviews tab asks for a
   * recording from people who already have. Offering all four everywhere would
   * mean every tab showing two buttons that can only ever skip everybody.
   */
  actions: readonly BulkAction[] = CANDIDATE_ACTIONS,
  /**
   * Buttons that belong in this bar but do not send a fixed message.
   *
   * The offer editor is the only one: it opens a table of terms rather than a
   * confirmation, so it cannot go through the dialog below — but it is the
   * same selection and belongs in the same bar.
   */
  extra?: React.ReactNode,
) {
  const [batch, setBatch] = useState<BatchState | null>(null);
  const [asking, setAsking] = useState<BulkAction | null>(null);
  const [pace, setPace] = useState<number>(DEFAULT_PACE_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  /** Today's warm-up allowance, so the bar can say what is left before it is spent. */
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  /**
   * The server refused the batch for being over the cap, and is waiting to be
   * told whether to do it anyway.
   */
  const [overAsk, setOverAsk] = useState<{ wouldSend: number; allowance: Allowance } | null>(null);
  const started = useRef(false);

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  /** Polls while something is running, then stops. */
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/bulk-email");
      const data = (await res.json()) as {
        ok?: boolean;
        batch?: BatchState | null;
        allowance?: Allowance;
      };
      if (data.ok) {
        setBatch(data.batch ?? null);
        if (data.allowance) setAllowance(data.allowance);
      }
    } catch {
      /* the next poll will do */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!batch || isFinished(batch)) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [batch, refresh]);

  /** What pressing the button would actually do, worked out before it is pressed. */
  const plan = useMemo(() => {
    if (!asking) return { include: [] as CandidateView[], skip: [] as Skipped[], warn: [] as Skipped[] };
    const include: CandidateView[] = [];
    const skip: Skipped[] = [];
    const warn: Skipped[] = [];
    for (const id of selected) {
      const c = byId.get(id);
      if (!c) continue;
      const verdict = eligibility(asking, {
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        interviewCompleted: c.interviewCompleted,
        interviewEmailSentAt: c.interviewEmailSentAt,
        voiceRequestedAt: c.voiceRequestedAt,
        documents: c.documents,
        voiceStatus: c.voiceStatus,
        voiceAckSentAt: c.voiceAckSentAt,
        offerSentAt: c.offerSentAt,
        offerAcceptedAt: c.offerAcceptedAt,
        offerDeclinedAt: c.offerDeclinedAt,
        offerReminderCount: c.offerReminderCount,
      });
      const name = c.fullName || c.email || c.id;
      if (!verdict.include) skip.push({ name, reason: verdict.reason });
      else {
        include.push(c);
        if (verdict.warn) warn.push({ name, reason: verdict.warn });
      }
    }
    return { include, skip, warn };
  }, [asking, selected, byId]);

  async function start(override = false) {
    if (!asking || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost("/api/admin/bulk-email", {
        action: asking,
        ids: plan.include.map((c) => c.id),
        paceSeconds: pace,
        override,
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        batch?: BatchState;
        skipped?: Skipped[];
        allowance?: Allowance;
        wouldSend?: number;
      };
      if (data.ok && data.batch) {
        setBatch(data.batch);
        setSkipped(data.skipped ?? []);
        setAsking(null);
        setOverAsk(null);
        clearSelection();
        started.current = true;
      } else if (data.error === "warmup_limit" && data.allowance) {
        // Not an error to report — a question to put. The server has done the
        // eligibility pass, so the number it sends back is how many messages
        // would really leave, which is the only number worth warning about.
        setAllowance(data.allowance);
        setOverAsk({ wouldSend: data.wouldSend ?? plan.include.length, allowance: data.allowance });
      } else if (data.error === "busy") {
        setError("A batch is already running. Wait for it to finish, or stop it first.");
        if (data.batch) setBatch(data.batch);
      } else {
        setError(`Could not start (${data.error ?? "unknown"}).`);
      }
    } catch {
      setError("Could not start. Please try again.");
    }
    setBusy(false);
  }

  async function control(command: "pause" | "resume" | "cancel") {
    try {
      const res = await adminPost("/api/admin/bulk-email/control", { command });
      const data = (await res.json()) as { ok?: boolean; batch?: BatchState };
      if (data.ok) setBatch(data.batch ?? null);
    } catch {
      /* the poll will catch up */
    }
  }

  async function dismiss() {
    try {
      await fetch("/api/admin/bulk-email", {
        method: "DELETE",
        headers: {
          "x-csrf-token": decodeURIComponent(
            document.cookie.split("; ").find((c) => c.startsWith("wr_admin_csrf="))?.split("=")[1] ?? "",
          ),
        },
      });
    } catch {
      /* ignore */
    }
    setBatch(null);
    setSkipped([]);
  }

  const tooMany = selected.length > MAX_BATCH;

  const bar =
    selected.length > 0 ? (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand-300 bg-brand-50 px-4 py-3">
        <p className="text-sm font-bold text-navy-900">
          {selected.length} selected
        </p>
        {actions.map((action, i) => (
          <button
            key={action}
            type="button"
            onClick={() => setAsking(action)}
            disabled={tooMany}
            className={
              i === 0
                ? "inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800 disabled:opacity-40"
                : "inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-white px-3.5 py-1.5 text-xs font-bold text-navy-800 transition hover:bg-navy-100 disabled:opacity-40"
            }
          >
            <Icon name={ACTION_ICON[action]} className="h-3.5 w-3.5" />
            {ACTION_LABEL[action]}
          </button>
        ))}
        {extra}
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-navy-600 transition hover:bg-white"
        >
          Clear
        </button>
        {tooMany ? (
          <p className="text-xs font-semibold text-red-700">
            {MAX_BATCH} at a time is the limit — unselect {selected.length - MAX_BATCH}.
          </p>
        ) : null}
      </div>
    ) : null;

  const panel = batch ? <BatchPanel batch={batch} skipped={skipped} onControl={control} onDismiss={dismiss} /> : null;

  /**
   * The warm-up question, asked only when the answer changes something.
   *
   * Deliberately not a blocker. A hard stop would eventually hold back an
   * offer that expires today, and somebody would work around it by sending by
   * hand — which spends the same reputation with none of it recorded. Going
   * ahead is one press, and it is written down.
   */
  const overDialog = (
    <ConfirmDialog
      open={!!overAsk}
      icon="mail"
      tone="danger"
      title="More than today's warm-up allowance"
      confirmLabel={busy ? "Sending…" : "Send them all anyway"}
      busy={busy}
      onCancel={() => setOverAsk(null)}
      onConfirm={() => void start(true)}
      body={
        overAsk ? (
          <div className="space-y-3">
            <p>
              This batch is <strong className="text-navy-900">{overAsk.wouldSend}</strong> messages
              and only <strong className="text-navy-900">{overAsk.allowance.remaining}</strong>{" "}
              of today&rsquo;s {overAsk.allowance.cap} are left.
            </p>
            <p className="rounded-lg border border-navy-100 bg-cream-50 px-3 py-2 text-xs text-navy-600">
              <strong className="text-navy-800">Cancel</strong> and the batch is not started. Send a
              smaller selection now, or start this one tomorrow.
              <br />
              <strong className="text-navy-800">Send anyway</strong> and all{" "}
              {overAsk.wouldSend} go out today, past the cap. It is recorded on the Warm-up tab so
              the figures there stay honest.
            </p>
            <p className="text-xs text-navy-500">
              The cap exists because workroute.co.uk has no sending history yet. A sudden jump in
              volume is the single thing most likely to put this mail in spam folders — and once it
              lands there, it keeps landing there.
            </p>
          </div>
        ) : null
      }
    />
  );

  const dialog = (
    <ConfirmDialog
      open={!!asking && !overAsk}
      icon="mail"
      size="lg"
      title={asking ? `${ACTION_LABEL[asking]} to ${plan.include.length}?` : ""}
      confirmLabel={busy ? "Starting…" : `Send to ${plan.include.length}`}
      busy={busy || plan.include.length === 0}
      onCancel={() => {
        setAsking(null);
        setError("");
      }}
      onConfirm={() => void start()}
      body={
        <div>
          <p>
            <strong className="text-navy-900">{plan.include.length}</strong> of {selected.length}{" "}
            selected will be emailed, one at a time.
            {plan.skip.length ? (
              <>
                {" "}
                <strong className="text-navy-900">{plan.skip.length}</strong> will be skipped.
              </>
            ) : null}
          </p>

          {/* Who is in, by name. A count alone is the thing nobody can check. */}
          <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-navy-100 bg-cream-50 p-3 text-xs">
            {plan.include.map((c) => (
              <p key={c.id} className="text-navy-700">
                {c.fullName || c.id} <span className="text-navy-400">· {c.email}</span>
              </p>
            ))}
            {plan.include.length === 0 ? (
              <p className="text-navy-500">Nobody selected can be sent this email.</p>
            ) : null}
          </div>

          {plan.skip.length ? (
            <div className="mt-3 rounded-lg border border-navy-200 bg-navy-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-600">Skipped</p>
              <ul className="mt-1.5 space-y-1 text-xs text-navy-600">
                {plan.skip.map((s) => (
                  <li key={s.name}>
                    <span className="font-semibold text-navy-800">{s.name}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {plan.warn.length ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-900">
                Worth knowing
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-900">
                {plan.warn.map((s) => (
                  <li key={s.name}>
                    <span className="font-semibold">{s.name}</span> — {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="mt-4 block text-xs font-bold text-navy-700">
            How fast
            <select
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="input mt-1.5 !py-2 text-sm font-normal"
            >
              {PACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-1.5 text-xs text-navy-500">
            About {batchDuration(plan.include.length, pace)} in all. The sending happens on the
            server — you can close this tab.
          </p>

          {/* Said before the button is pressed, not only after being refused.
              A limit you meet by surprise feels like a fault; the same limit
              seen in advance is just a number you plan around. */}
          {allowance ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                plan.include.length > allowance.remaining
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-navy-100 bg-cream-50 text-navy-600"
              }`}
            >
              Warm-up: <strong>{allowance.remaining}</strong> of {allowance.cap} left today.
              {plan.include.length > allowance.remaining ? (
                <>
                  {" "}
                  This batch is {plan.include.length - allowance.remaining} over — the rest would go
                  out tomorrow.
                </>
              ) : null}
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      }
    />
  );

  return {
    bar,
    panel,
    dialog: (
      <>
        {dialog}
        {overDialog}
      </>
    ),
    refresh,
  };
}

function BatchPanel({
  batch,
  skipped,
  onControl,
  onDismiss,
}: {
  batch: BatchState;
  skipped: Skipped[];
  onControl: (c: "pause" | "resume" | "cancel") => void;
  onDismiss: () => void;
}) {
  const c = counts(batch);
  const done = c.sent + c.failed;
  const pct = c.total ? Math.round((done / c.total) * 100) : 0;
  const finished = isFinished(batch);
  const next = batch.items.find((i) => i.state === "pending");

  return (
    <div className="card mb-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-navy-900">
            {ACTION_LABEL[batch.action]} — {c.sent} of {c.total} sent
            {c.failed ? <span className="text-red-700"> · {c.failed} failed</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-navy-500">
            {/* Held is not paused: nobody stopped it and nothing is wrong, so
                it is said in its own words rather than borrowing the wording
                for a batch somebody halted. */}
            {batch.status === "running" && batch.heldUntil ? (
              <span className="font-semibold text-amber-700">
                Today&rsquo;s warm-up allowance is spent — holding until{" "}
                {fmtTime(batch.heldUntil)}, then carrying on by itself.
                {next ? ` ${next.name} is next.` : ""}
              </span>
            ) : batch.status === "running" && next ? (
              <>
                Next: <span className="font-semibold text-navy-700">{next.name}</span>
                {batch.nextAt ? ` at about ${fmtTime(batch.nextAt)}` : ""} · one every{" "}
                {batch.paceSeconds}s
              </>
            ) : batch.status === "paused" ? (
              "Paused. Nothing is being sent."
            ) : batch.status === "cancelled" ? (
              "Stopped. The ones already sent are listed below."
            ) : (
              `Finished at ${fmtTime(batch.finishedAt)}.`
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {batch.status === "running" ? (
            <button
              type="button"
              onClick={() => onControl("pause")}
              className="rounded-full border border-navy-200 px-3.5 py-1.5 text-xs font-bold text-navy-700 transition hover:bg-navy-50"
            >
              Pause
            </button>
          ) : null}
          {batch.status === "paused" ? (
            <button
              type="button"
              onClick={() => onControl("resume")}
              className="rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800"
            >
              Resume
            </button>
          ) : null}
          {!finished ? (
            <button
              type="button"
              onClick={() => onControl("cancel")}
              className="rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-100">
        <div
          className={`h-full rounded-full transition-all ${c.failed ? "bg-amber-500" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Names, not a number. "Three failed" is the one report nobody can act
          on; "Ada Eze — no_email" is a thing to go and fix. */}
      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-navy-100">
        <ul className="divide-y divide-navy-50 text-xs">
          {batch.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
              <span className="min-w-0 truncate text-navy-700">
                {item.name} <span className="text-navy-400">· {item.email}</span>
              </span>
              <span
                className={`shrink-0 font-semibold ${
                  item.state === "sent"
                    ? "text-green-700"
                    : item.state === "failed"
                      ? "text-red-700"
                      : "text-navy-400"
                }`}
              >
                {item.state === "sent"
                  ? `sent ${fmtTime(item.at)}`
                  : item.state === "failed"
                    ? `failed — ${item.reason ?? "unknown"}`
                    : "waiting"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {skipped.length ? (
        <p className="mt-2 text-xs text-navy-500">
          {skipped.length} selected {skipped.length === 1 ? "person was" : "people were"} left out:{" "}
          {skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
