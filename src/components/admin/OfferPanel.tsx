"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { adminPost } from "@/lib/adminClient";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  advertisedFor,
  belowAdvertised,
  formatRate,
  offerProblems,
  offerStatus,
  ENGAGEMENT_TYPES,
  type EngagementType,
  type Offer,
  type OfferState,
} from "@/lib/offer";

/**
 * Make and track a written job offer.
 *
 * Appears once the voice assessment is passed, because that is where this
 * company's process puts the live interview — the terms in this form are what
 * was agreed on that call, which is why the rate is typed rather than taken
 * from the listing.
 */

const TONE: Record<ReturnType<typeof offerStatus>, string> = {
  none: "bg-navy-50 text-navy-500 border-navy-200",
  sent: "bg-brand-50 text-brand-800 border-brand-300",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function OfferPanel({
  id,
  fullName,
  position,
  hasEmail,
  initial,
  onChange,
}: {
  id: string;
  fullName?: string;
  position: string;
  hasEmail: boolean;
  initial: OfferState;
  onChange: (patch: OfferState & { status?: string }) => void;
}) {
  const [state, setState] = useState(initial);
  const advertised = advertisedFor(position);

  const [form, setForm] = useState<Partial<Offer>>({
    position,
    // Prefilled with the bottom of the advertised band, since that is the
    // number that was promised. The real figure comes from the call.
    rate: state.offer?.rate ?? advertised?.min,
    currency: state.offer?.currency ?? advertised?.currency ?? "USD",
    unit: state.offer?.unit ?? advertised?.unit ?? "HOUR",
    hoursPerWeek: state.offer?.hoursPerWeek,
    startDate: state.offer?.startDate,
    engagement: state.offer?.engagement ?? "Independent contractor",
    probation: state.offer?.probation ?? "",
    note: state.offer?.note ?? "",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);

  const status = offerStatus(state);
  const problems = offerProblems(form);
  const low = problems.length === 0 ? belowAdvertised(form as Offer) : null;
  const showForm = status === "none" || editing;

  function set<K extends keyof Offer>(key: K, value: Offer[K] | undefined) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function act(action: string, extra?: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminPost(`/api/admin/candidates/${id}/offer`, { action, ...extra });
      const data = (await res.json()) as {
        ok?: boolean; error?: string; problems?: string[]; status?: string;
        offer?: Offer; offerSentAt?: string; offerAcceptedAt?: string;
        offerDeclinedAt?: string; offerDeclineReason?: string;
      };
      if (!data.ok) {
        setError(data.problems?.join(" ") ?? `Could not send (${data.error ?? "unknown"}).`);
      } else {
        const next: OfferState = {
          offer: data.offer ?? state.offer,
          offerSentAt: data.offerSentAt ?? state.offerSentAt,
          offerAcceptedAt: data.offerAcceptedAt,
          offerDeclinedAt: data.offerDeclinedAt,
          offerDeclineReason: data.offerDeclineReason,
        };
        setState(next);
        setEditing(false);
        onChange({ ...next, status: data.status });
      }
    } catch {
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-navy-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-navy-800">Job offer</p>
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONE[status]}`}
          >
            {status === "accepted" ? <Icon name="checkCircle" className="h-3 w-3" /> : null}
            {status === "none" ? "Not sent" : status === "sent" ? "Sent" : status === "accepted" ? "Accepted" : "Declined"}
          </span>
        </div>
        {status !== "none" && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Send a revised offer
          </button>
        ) : null}
      </div>

      {/* What was actually sent, once it has been. */}
      {state.offer && !editing ? (
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          <Row label="Position" value={state.offer.position} />
          <Row label="Pay" value={formatRate(state.offer)} />
          <Row label="Engagement" value={state.offer.engagement} />
          {state.offer.hoursPerWeek ? (
            <Row label="Hours" value={`${state.offer.hoursPerWeek} per week`} />
          ) : null}
          {state.offer.startDate ? <Row label="Start date" value={state.offer.startDate} /> : null}
          {state.offer.probation ? <Row label="Probation" value={state.offer.probation} /> : null}
          {state.offer.note ? <Row label="Note" value={state.offer.note} full /> : null}
        </dl>
      ) : null}

      {status === "sent" && !editing ? (
        <p className="mt-3 text-sm text-navy-500">Sent {fmt(state.offerSentAt)}. Waiting for their answer.</p>
      ) : null}
      {status === "accepted" ? (
        <p className="mt-3 text-sm font-medium text-green-700">
          Accepted {fmt(state.offerAcceptedAt)}. Send them the agreement to sign.
        </p>
      ) : null}
      {status === "declined" ? (
        <p className="mt-3 text-sm font-medium text-red-600">
          Declined {fmt(state.offerDeclinedAt)}
          {state.offerDeclineReason ? ` — ${state.offerDeclineReason}` : ""}.
        </p>
      ) : null}

      {/* The form. */}
      {showForm ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Position">
            <input
              className="input !py-2 text-sm"
              value={form.position ?? ""}
              onChange={(e) => set("position", e.target.value)}
            />
          </Field>
          <Field label="Agreed rate">
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                className="input !py-2 text-sm"
                value={form.rate ?? ""}
                onChange={(e) => set("rate", e.target.value === "" ? undefined : Number(e.target.value))}
              />
              <select
                className="select !w-auto !py-2 text-sm"
                value={form.unit}
                onChange={(e) => set("unit", e.target.value as Offer["unit"])}
                aria-label="Rate period"
              >
                <option value="HOUR">per hour</option>
                <option value="DAY">per day</option>
                <option value="WEEK">per week</option>
                <option value="MONTH">per month</option>
                <option value="YEAR">per year</option>
              </select>
            </div>
          </Field>
          <Field label="Hours per week">
            <input
              type="number"
              min={1}
              max={168}
              className="input !py-2 text-sm"
              value={form.hoursPerWeek ?? ""}
              onChange={(e) =>
                set("hoursPerWeek", e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              className="input !py-2 text-sm"
              value={form.startDate ?? ""}
              onChange={(e) => set("startDate", e.target.value || undefined)}
            />
          </Field>
          <Field label="Engagement">
            <select
              className="select !py-2 text-sm"
              value={form.engagement}
              onChange={(e) => set("engagement", e.target.value as EngagementType)}
            >
              {ENGAGEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Probation">
            <input
              className="input !py-2 text-sm"
              placeholder="e.g. 1 month"
              value={form.probation ?? ""}
              onChange={(e) => set("probation", e.target.value)}
            />
          </Field>
          <Field label="Anything else you agreed" full>
            <input
              className="input !py-2 text-sm"
              placeholder="Optional — appears in the offer"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
            />
          </Field>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {!hasEmail ? (
        <p className="mt-3 text-sm font-medium text-amber-700">
          No email address on this candidate — an offer cannot be sent.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
        {showForm ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmSend(true)}
              disabled={busy || problems.length > 0 || !hasEmail}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-navy-800 disabled:opacity-40"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {status === "none" ? "Send offer" : "Send revised offer"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-navy-600 transition hover:bg-navy-100"
              >
                Cancel
              </button>
            ) : null}
            {problems.length > 0 ? (
              <p className="text-xs font-medium text-navy-500">{problems[0]}</p>
            ) : null}
          </>
        ) : null}

        {status === "sent" && !editing ? (
          <>
            <button
              type="button"
              onClick={() => act("accepted")}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-40"
            >
              <Icon name="checkCircle" className="h-3.5 w-3.5" />
              They accepted
            </button>
            <button
              type="button"
              onClick={() => setDeclining(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
            >
              They declined
            </button>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmSend}
        icon="mail"
        title={status === "none" ? "Send this offer?" : "Send a revised offer?"}
        confirmLabel="Send offer"
        busy={busy}
        warning={
          low
            ? `This is below the ${formatRate({ rate: low.min, currency: low.currency, unit: low.unit })} you advertise for ${form.position}.`
            : status !== "none"
              ? "This replaces the offer they already have, and clears their previous answer."
              : undefined
        }
        onCancel={() => setConfirmSend(false)}
        onConfirm={() => {
          setConfirmSend(false);
          void act("send", { offer: form });
        }}
        body={
          <>
            <strong className="text-navy-900">{fullName || "This candidate"}</strong> will be
            emailed a written offer of{" "}
            <strong className="text-navy-900">
              {form.rate ? formatRate(form as Offer) : "—"}
            </strong>{" "}
            for {form.position}. It says plainly that this is an offer rather than a contract, and
            that they will never be asked for a payment.
          </>
        }
      />

      <ConfirmDialog
        open={declining}
        icon="close"
        tone="danger"
        title="They declined the offer?"
        confirmLabel="Record decline"
        busy={busy}
        onCancel={() => setDeclining(false)}
        onConfirm={() => {
          setDeclining(false);
          void act("declined", { reason });
        }}
        body={
          <div>
            <p>
              <strong className="text-navy-900">{fullName || "This candidate"}</strong> will be
              marked as Rejected.
            </p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="input mt-3 !py-2 text-sm"
            />
          </div>
        }
      />
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-navy-500">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900">{value}</dd>
    </div>
  );
}
