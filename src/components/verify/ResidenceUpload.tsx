"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { prepareImage } from "@/components/verify/prepareImage";
import { IMAGE_MIME, MAX_IMAGE_BYTES, type DocumentKind } from "@/lib/documents";
import { MAX_EXPLANATION } from "@/lib/residence";

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
 * Two photographs, for the same reason the identity check is two: a picture of
 * a card proves a card exists, and a picture of a person holding it proves it
 * is theirs.
 *
 * And a way out, because the people who cannot answer are otherwise the people
 * who go silent. Plenty of legitimate residents hold no permit card at all —
 * students, dependants, anyone mid-application, anyone in a country that does
 * not issue one — and for them the honest answer is a paragraph, not a
 * document. A recruiter reads it and decides. Without that box the only reply
 * available to an honest person with no card is nothing, which looks exactly
 * like evasion.
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
    title: "Your residence permit",
    hint: "The side with your photograph and the permit number. All four corners visible, text readable.",
  },
  {
    kind: "residenceSelfie",
    title: "A photo of you holding it",
    hint: "Your face and the permit in the same picture, both clearly visible. A phone selfie is fine.",
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
  const [noPermit, setNoPermit] = useState(false);
  const [explanation, setExplanation] = useState("");
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

    /* -- the no-permit path: words instead of photographs ------------------ */
    if (noPermit) {
      if (explanation.trim().length < 20) {
        setFormError(
          "Please write a little more — a sentence or two about why you are living" +
            `${where || " there"} is enough.`,
        );
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/applications/residence-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: candidateId, explanation: explanation.trim() }),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (data.ok) onDone();
        else setFormError("That did not go through. Please try again.");
      } catch {
        setFormError("We could not reach the server. Please check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    /* -- the ordinary path ------------------------------------------------- */
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

  /**
   * Enabled as soon as there is something to send.
   *
   * Deliberately not gated on the length the server wants. A button that
   * greys itself out at nineteen characters and says nothing is a dead end:
   * the candidate can see they have written something and cannot see why it
   * is not enough. Letting the press happen and answering it in words is the
   * only version where they find out.
   */
  const ready = noPermit
    ? explanation.trim().length > 0 && !submitting
    : SLOTS.every((s) => !!files[s.kind]) && !submitting;

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
            Your written agreement has to carry the address where you actually live, so we need
            one document showing you are resident{where || " there"}. This takes about a minute.
          </p>
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

      {/* Offered before the photo boxes, not after. Somebody with no permit
          should not have to work out that the two upload boxes are not for
          them by failing to fill them in. */}
      <label
        className={`mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
          noPermit
            ? "border-brand-400 bg-brand-50/60"
            : "border-navy-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
        } ${submitting ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="checkbox"
          checked={noPermit}
          disabled={submitting}
          onChange={(e) => {
            setNoPermit(e.target.checked);
            setFormError("");
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-navy-900">
            I do not have a residence permit
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-navy-500">
            Tick this and tell us why you are living{where || " there"} instead. Plenty of people
            have no permit card, and it does not count against you.
          </span>
        </span>
      </label>

      {noPermit ? (
        <div className="mt-5">
          <label htmlFor="residence-explanation" className="block text-sm font-bold text-navy-900">
            Why are you living{where || " there"}?
          </label>
          <p className="mt-1 text-xs leading-relaxed text-navy-500">
            A sentence or two is enough — for example that you are studying, that you are there
            with family, that your permit application is still being processed, or that the
            country does not issue one. A recruiter will read this.
          </p>
          <textarea
            id="residence-explanation"
            value={explanation}
            disabled={submitting}
            maxLength={MAX_EXPLANATION}
            rows={5}
            onChange={(e) => setExplanation(e.target.value)}
            className="mt-3 w-full rounded-xl border-2 border-navy-200 px-4 py-3 text-sm leading-relaxed text-navy-900 focus:border-brand-400 focus:outline-none"
            placeholder="I have been living here since 2023 on a student visa while I finish my degree…"
          />
          <p className="mt-1 text-right text-[11px] text-navy-400">
            {explanation.trim().length} / {MAX_EXPLANATION}
          </p>
        </div>
      ) : (
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
                    capture={slot.kind === "residenceSelfie" ? "user" : undefined}
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
                        <Icon
                          name={slot.kind === "residenceSelfie" ? "users" : "upload"}
                          className="h-8 w-8"
                        />
                        <span className="text-xs font-semibold">
                          {slot.kind === "residenceSelfie" ? "Take a photo" : "Choose a photo"}
                        </span>
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
      )}

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
            Used only to confirm your address, never shared onward
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
        {submitting ? "Sending…" : noPermit ? "Send my explanation" : "Send my documents"}
      </button>
    </div>
  );
}
