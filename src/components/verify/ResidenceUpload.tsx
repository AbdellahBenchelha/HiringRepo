"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { prepareImage } from "@/components/verify/prepareImage";
import { IMAGE_MIME, MAX_IMAGE_BYTES, type DocumentKind } from "@/lib/documents";

/**
 * Proving you live where you said you live.
 *
 * Asked only of candidates a recruiter has asked, and only because the written
 * agreement carries a residence address. The identity photographs prove who
 * somebody is and which country issued their document; for anybody whose
 * nationality and address are different countries — which is ordinary, and
 * usually the whole reason they are working remotely — nothing on file
 * connects them to the address the contract will name.
 *
 * The front and the back of one document — a residence permit, national ID or
 * driving licence issued by the country they live in. It does not have to
 * show an address: it only has to show they live in that country.
 *
 * Required: there is no way round it on this page. (Candidates asked before
 * this could answer in writing instead; those answers stay on their record
 * and in the Admin Panel.)
 */

type SlotState = "empty" | "preparing" | "ready" | "uploading" | "done" | "error";

interface Slot {
  kind: DocumentKind;
  title: string;
  hint: string;
}

const SLOTS: Slot[] = [
  {
    kind: "residencePermit",
    title: "Front of the document",
    hint: "The side with your photograph. All four corners visible, text readable.",
  },
  {
    kind: "residenceBack",
    title: "Back of the document",
    hint: "The other side of the same document. All four corners visible, text readable.",
  },
];

export function ResidenceUpload({
  candidateId,
  country,
  reason,
  onDone,
}: {
  candidateId: string;
  /** The country they are being asked to prove. May be unknown. */
  country?: string;
  /** Why they are being asked, in the recruiter's words. Shown verbatim. */
  reason?: string;
  onDone: () => void;
}) {
  const [files, setFiles] = useState<Partial<Record<DocumentKind, File>>>({});
  const [states, setStates] = useState<Partial<Record<DocumentKind, SlotState>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentKind, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const previews = useRef<Partial<Record<DocumentKind, string>>>({});

  // Object URLs are a leak if they outlive the component.
  useEffect(() => {
    const urls = previews.current;
    return () => {
      Object.values(urls).forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, []);

  const where = country ? ` in ${country}` : "";

  async function pick(kind: DocumentKind, file: File | null) {
    setErrors((e) => ({ ...e, [kind]: "" }));
    if (!file) {
      setFiles((f) => ({ ...f, [kind]: undefined }));
      setStates((s) => ({ ...s, [kind]: "empty" }));
      return;
    }
    if (!(IMAGE_MIME as readonly string[]).includes(file.type)) {
      setErrors((e) => ({ ...e, [kind]: "Please choose a JPG or PNG photo." }));
      return;
    }

    setStates((s) => ({ ...s, [kind]: "preparing" }));
    const prepared = await prepareImage(file);

    if (prepared.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, [kind]: "That photo is too large, even after resizing." }));
      setStates((s) => ({ ...s, [kind]: "empty" }));
      return;
    }

    const old = previews.current[kind];
    if (old) URL.revokeObjectURL(old);
    previews.current[kind] = URL.createObjectURL(prepared);

    setFiles((f) => ({ ...f, [kind]: prepared }));
    setStates((s) => ({ ...s, [kind]: "ready" }));
  }

  async function uploadOne(kind: DocumentKind, file: File): Promise<boolean> {
    setStates((s) => ({ ...s, [kind]: "uploading" }));
    try {
      const res = await fetch("/api/applications/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: candidateId,
          kind,
          filename: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; key?: string; error?: string };
      // "Try again" is the wrong advice when the answer is "wait" — say which.
      if (res.status === 429) {
        const mins = Math.ceil(Number(res.headers.get("Retry-After") ?? 600) / 60);
        setErrors((e) => ({
          ...e,
          [kind]: `Too many attempts. Please wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
        }));
        setStates((s) => ({ ...s, [kind]: "error" }));
        return false;
      }
      if (!data.ok || !data.url || !data.key) throw new Error(data.error ?? `http_${res.status}`);

      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`storage_${put.status}`);

      const confirm = await fetch("/api/applications/documents/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: candidateId, kind, key: data.key, filename: file.name }),
      });
      const result = (await confirm.json()) as { status?: string; reason?: string };
      if (result.status === "blocked") {
        setErrors((e) => ({ ...e, [kind]: result.reason ?? "That file was not accepted." }));
        setStates((s) => ({ ...s, [kind]: "error" }));
        return false;
      }

      setStates((s) => ({ ...s, [kind]: "done" }));
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[residence] ${kind} upload failed`, err);
      setErrors((e) => ({ ...e, [kind]: "Upload failed. Please check your connection and try again." }));
      setStates((s) => ({ ...s, [kind]: "error" }));
      return false;
    }
  }

  async function submit() {
    if (submitting) return;
    setFormError("");

    if (SLOTS.some((s) => !files[s.kind])) return;

    setSubmitting(true);
    // Sequential, not in parallel: these are phone uploads on phone
    // connections, and two at once on a weak signal is how both fail.
    let allOk = true;
    for (const slot of SLOTS) {
      const file = files[slot.kind];
      if (!file) continue;
      const ok = await uploadOne(slot.kind, file);
      allOk = allOk && ok;
    }
    setSubmitting(false);
    if (allOk) onDone();
    else setFormError("Some photos did not go through. Please fix the ones marked below and try again.");
  }

  /** Both sides chosen — the back is required as much as the front. */
  const ready = SLOTS.every((s) => !!files[s.kind]) && !submitting;
  // Named for their country, so nobody sends a document from the wrong one.
  const accepted = ["residence permit", "national ID card", "driving licence"].map((d) =>
    country ? `${country} ${d}` : d.charAt(0).toUpperCase() + d.slice(1),
  );

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon name="mapPin" className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Action needed</p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">
            Confirm where you live
          </h1>
          <p className="mt-2 leading-relaxed text-navy-600">
            We need to confirm that you live{where || " in the country you told us"}. Please upload
            the front and back of one of these documents
            {country ? "" : ", issued by the country you live in"}. This takes about a minute.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Documents we accept">
            {accepted.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-700"
              >
                <Icon name="check" className="h-3 w-3 text-green-600" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reason ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-900">Why we are asking</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">{reason}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {SLOTS.map((slot, index) => {
            const state = states[slot.kind] ?? "empty";
            const preview = previews.current[slot.kind];
            const error = errors[slot.kind];
            return (
              <div
                key={slot.kind}
                className={`rounded-2xl border-2 p-4 transition ${
                  error
                    ? "border-red-300 bg-red-50/40"
                    : state === "done"
                      ? "border-green-300 bg-green-50/40"
                      : preview
                        ? "border-brand-300 bg-brand-50/30"
                        : "border-dashed border-navy-200 bg-white"
                }`}
              >
                <div className="sm:min-h-[4.5rem]">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        state === "done" || preview
                          ? "bg-green-600 text-white"
                          : "bg-navy-100 text-navy-600"
                      }`}
                    >
                      {state === "done" || preview ? (
                        <Icon name="check" className="h-3.5 w-3.5" />
                      ) : (
                        String(index + 1)
                      )}
                    </span>
                    <p className="text-sm font-bold text-navy-900">{slot.title}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{slot.hint}</p>
                </div>

                {/* The whole box is the target. A native file button is a small
                    thing to hit on a phone, which is where these are taken. */}
                <label
                  className={`group mt-3 block cursor-pointer overflow-hidden rounded-xl ${
                    submitting ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <span className="sr-only">{slot.title}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={submitting}
                    onChange={(e) => pick(slot.kind, e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <span
                    className={`relative flex aspect-[4/3] items-center justify-center rounded-xl transition ${
                      preview
                        ? "bg-navy-100"
                        : "border-2 border-dashed border-navy-200 bg-navy-50 group-hover:border-brand-400 group-hover:bg-brand-50/50"
                    }`}
                  >
                    {preview ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={`${slot.title} preview`}
                          className="absolute inset-0 h-full w-full object-contain p-1"
                        />
                        <span className="relative rounded-full bg-navy-900/80 px-3 py-1.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                          Choose a different photo
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-col items-center gap-2 text-navy-500 transition group-hover:text-brand-700">
                        <Icon name="upload" className="h-8 w-8" />
                        <span className="text-xs font-semibold">Choose a photo</span>
                        <span className="text-[11px] font-medium text-navy-400">JPG or PNG</span>
                      </span>
                    )}
                  </span>
                </label>

                <p className="mt-2.5 flex items-center gap-1.5 text-xs">
                  {state === "preparing" ? (
                    <span className="font-medium text-navy-600">Preparing photo…</span>
                  ) : state === "uploading" ? (
                    <span className="font-medium text-navy-600">Uploading…</span>
                  ) : state === "done" ? (
                    <>
                      <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0 text-green-600" />
                      <span className="font-semibold text-green-700">Uploaded</span>
                    </>
                  ) : error ? (
                    <span className="font-medium text-red-700">{error}</span>
                  ) : (
                    <span className="text-navy-400">Not chosen yet</span>
                  )}
                </p>
              </div>
            );
          })}
      </div>

      <div className="mt-6 rounded-2xl border border-cream-300 bg-cream-100 p-4">
        <ul className="space-y-1.5 text-xs text-navy-600">
          <li className="flex items-start gap-2">
            <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
            Stored privately — nobody can open them without signing in
          </li>
          <li className="flex items-start gap-2">
            <Icon name="users" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
            Seen only by our recruitment team
          </li>
          <li className="flex items-start gap-2">
            <Icon name="checkCircle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-navy-400" />
            Used only to confirm where you live, never shared onward
          </li>
        </ul>
      </div>

      {formError ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!ready}
        onClick={submit}
        className="btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send my documents"}
      </button>
    </div>
  );
}
