"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { siteConfig } from "@/config/site";
import { IMAGE_MIME, MAX_IMAGE_BYTES, type DocumentKind } from "@/lib/documents";
import {
  ID_DOCUMENT_HINT,
  ID_DOCUMENT_LABEL,
  ID_DOCUMENT_TYPES,
  needsBack,
  type IdDocumentType,
} from "@/lib/identityDocuments";

/**
 * The identity photographs, and everything involved in getting them off a phone.
 *
 * Two or three of them, depending on the document: a passport carries
 * everything on one page and a card does not, so a card is photographed on
 * both sides. Which it is, the candidate says first — the alternative is
 * asking everyone for a "back" and receiving photographs of the blank reverse
 * of a passport.
 *
 * Asked at two different moments — after the assessment for candidates whose
 * country requires it, and again at the offer for anyone who has never been
 * asked — so it lives here rather than in either of them. The wording differs
 * between the two; nothing else does, and a second copy of this would drift
 * from the first in exactly the details that matter: the metadata stripping,
 * the size limit, the consent, the malware-scan verdict, the rate-limit
 * message.
 *
 * It renders the card and reports success through `onDone`. What a finished
 * upload should look like belongs to the page around it, which knows whether
 * this was the end of the road or the second half of accepting an offer.
 */

const MAX_EDGE = 2000;

/**
 * Shrink and re-encode a photo in the browser before it is uploaded.
 *
 * Drawing to a canvas and exporting drops every piece of metadata, which is the
 * point: a phone photograph carries the GPS coordinates of wherever the
 * passport was photographed, and there is no reason to hold that. Downscaling
 * also turns a 6 MB picture into a few hundred kilobytes, which on a phone
 * connection is the difference between an upload that finishes and one that
 * does not.
 *
 * Client-side, so a determined person could bypass it. That is acceptable: this
 * is data minimisation, not a security control.
 */
async function prepareImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    // 0.9 keeps an ID number legible. Lower starts losing small print.
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return file;

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

type SlotState = "empty" | "preparing" | "ready" | "uploading" | "done" | "error";

interface Slot {
  kind: DocumentKind;
  title: string;
  hint: string;
}

/**
 * Which photographs to ask for, given the document they chose.
 *
 * Derived rather than a fixed list: a passport has one page worth
 * photographing and a card has two, and asking a passport holder for "the
 * back" produces either a photograph of nothing or a support email.
 */
function slotsFor(type: IdDocumentType): Slot[] {
  const front: Slot = {
    kind: "identity",
    title: type === "passport" ? "Your passport page" : `Front of your ${ID_DOCUMENT_LABEL[type].toLowerCase()}`,
    hint:
      type === "passport"
        ? "The page with your photograph and details on it. All four corners visible, text readable."
        : "The side with your photograph on it. All four corners visible, text readable.",
  };
  const back: Slot = {
    kind: "identityBack",
    title: "Back of the card",
    hint: "The reverse side. Some details are only printed there, so we need both.",
  };
  const selfie: Slot = {
    kind: "selfie",
    title: "A photo of you holding it",
    hint: "Your face and the document in the same picture, both clearly visible. A phone selfie is fine.",
  };
  return needsBack(type) ? [front, back, selfie] : [front, selfie];
}

/** What we promise about these images, in the place where it is being asked. */
const ASSURANCES: { icon: "shield" | "users" | "checkCircle"; text: string }[] = [
  { icon: "shield", text: "Stored privately — nobody can open them without signing in" },
  { icon: "users", text: "Seen only by our recruitment team" },
  { icon: "checkCircle", text: "Used only to confirm who you are, never shared onward" },
];

export function IdentityUpload({
  candidateId,
  eyebrow,
  heading,
  intro,
  submitLabel = "Submit for verification",
  notice,
  onDone,
}: {
  candidateId: string;
  /** Small line above the heading — where in the process this is. */
  eyebrow: string;
  heading: string;
  intro: string;
  submitLabel?: string;
  /**
   * Why they are being asked again, in a recruiter's words.
   *
   * Shown above everything else. Someone sent back to this page without being
   * told what was wrong will send the same photograph a second time, and be
   * right to be annoyed when it is refused again.
   */
  notice?: string;
  onDone: () => void;
}) {
  const [docType, setDocType] = useState<IdDocumentType | null>(null);
  const [files, setFiles] = useState<Partial<Record<DocumentKind, File>>>({});
  const [states, setStates] = useState<Partial<Record<DocumentKind, SlotState>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentKind, string>>>({});
  const [consent, setConsent] = useState(false);
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
      console.warn(`[verification] ${kind} upload failed`, err);
      setErrors((e) => ({ ...e, [kind]: "Upload failed. Please check your connection and try again." }));
      setStates((s) => ({ ...s, [kind]: "error" }));
      return false;
    }
  }

  /**
   * Switching document type after choosing photographs.
   *
   * The back is dropped, because for a passport there is no slot to hold it
   * and leaving the file behind would upload a photograph nobody asked for.
   * The front and the selfie are kept: someone who picked "national ID" when
   * they meant "driver's licence" has photographed the right card either way.
   */
  function chooseType(next: IdDocumentType) {
    if (next === docType) return;
    setDocType(next);
    if (!needsBack(next)) {
      const url = previews.current.identityBack;
      if (url) URL.revokeObjectURL(url);
      delete previews.current.identityBack;
      setFiles((f) => ({ ...f, identityBack: undefined }));
      setStates((s) => ({ ...s, identityBack: "empty" }));
      setErrors((e) => ({ ...e, identityBack: "" }));
    }
  }

  const slots = docType ? slotsFor(docType) : [];

  async function submit() {
    if (!docType || !consent || submitting) return;
    const chosen = slots.map((s) => [s.kind, files[s.kind]] as const);
    if (chosen.some(([, file]) => !file)) return;

    setSubmitting(true);
    setFormError("");

    await fetch("/api/applications/verification-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId, documentType: docType }),
    }).catch(() => {});

    // Sequential, not in parallel: these are phone uploads on phone
    // connections, and three at once on a weak signal is how all three end up
    // failing instead of one.
    let allOk = true;
    for (const [kind, file] of chosen) {
      if (!file) continue;
      const ok = await uploadOne(kind, file);
      allOk = allOk && ok;
    }

    setSubmitting(false);
    if (allOk) onDone();
    else setFormError("Some photos did not go through. Please fix the ones marked below and try again.");
  }

  const ready = !!docType && slots.every((s) => !!files[s.kind]) && consent && !submitting;
  const missing = [
    !docType && "which document you are sending",
    ...slots.filter((s) => !files[s.kind]).map((s) => s.title.toLowerCase()),
    !consent && "your consent",
  ].filter((m): m is string => typeof m === "string");

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
          <Icon name="shield" className="h-6 w-6" />
        </span>
        <div>
          {/* Green reads as "you are on track", which is the wrong signal for
              someone whose documents were refused. */}
          <p
            className={`text-xs font-bold uppercase tracking-wide ${
              notice ? "text-amber-700" : "text-green-600"
            }`}
          >
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">{heading}</h1>
          <p className="mt-2 leading-relaxed text-navy-600">{intro}</p>
        </div>
      </div>

      {notice ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-bold text-amber-900">
              We need these photos again
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900">{notice}</p>
          </div>
        </div>
      ) : null}

      {/* First, because it decides how many photographs follow. Asking for the
          pictures and then which document they are of would mean rebuilding
          the form under someone who had already filled half of it in. */}
      <fieldset className="mt-8">
        <legend className="text-sm font-bold text-navy-900">
          Which document are you sending?
        </legend>
        <p className="mt-1 text-xs leading-relaxed text-navy-500">
          We can only accept these three. Choose the one you have with you.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {ID_DOCUMENT_TYPES.map((type) => {
            const active = docType === type;
            return (
              <label
                key={type}
                className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border-2 p-3.5 transition ${
                  active
                    ? "border-brand-400 bg-brand-50/60"
                    : "border-navy-200 bg-white hover:border-brand-300 hover:bg-brand-50/30"
                } ${submitting ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="idDocumentType"
                  value={type}
                  checked={active}
                  disabled={submitting}
                  onChange={() => chooseType(type)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-navy-900">
                    {ID_DOCUMENT_LABEL[type]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-navy-500">
                    {ID_DOCUMENT_HINT[type]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!docType ? (
        <p className="mt-6 rounded-xl border border-dashed border-navy-200 bg-navy-50 px-4 py-5 text-center text-sm font-medium text-navy-500">
          Choose a document above and we will show you which photos to take.
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {slots.map((slot, index) => {
          const step = String(index + 1);
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
              {/* Fixed height for the heading block: "Front of your national
                  identity card" wraps to two lines and "Back of the card" does
                  not, which without this leaves the two photo boxes beside
                  each other starting at different heights. */}
              <div className="sm:min-h-[5.25rem]">
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
                      step
                    )}
                  </span>
                  <p className="text-sm font-bold text-navy-900">{slot.title}</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{slot.hint}</p>
              </div>

              {/* The whole box is the target. A native file button is a
                  small thing to hit on a phone, which is where almost
                  every one of these photographs is taken. */}
              <label
                className={`group mt-3 block cursor-pointer overflow-hidden rounded-xl ${
                  submitting ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <span className="sr-only">{slot.title}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  capture={slot.kind === "selfie" ? "user" : undefined}
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
                      {/* Contained, not cropped: the hint above asks them to
                          check all four corners are in frame, which they
                          cannot do if the preview cuts the edges off. */}
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
                        name={slot.kind === "selfie" ? "users" : "upload"}
                        className="h-8 w-8"
                      />
                      <span className="text-xs font-semibold">
                        {slot.kind === "selfie" ? "Take a photo" : "Choose a photo"}
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
                  <span className="font-semibold text-red-600">{error}</span>
                ) : preview ? (
                  <>
                    <Icon name="checkCircle" className="h-3.5 w-3.5 shrink-0 text-green-600" />
                    <span className="font-medium text-green-700">Ready to send</span>
                  </>
                ) : (
                  <span className="font-medium text-navy-500">No photo chosen yet</span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl border border-navy-200 bg-white p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span className="text-sm leading-relaxed text-navy-700">
          I consent to {siteConfig.company.name} processing these images to verify my identity, as
          described in the{" "}
          <a href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">
            privacy policy
          </a>
          .
        </span>
      </label>

      {formError ? <p className="mt-3 text-sm font-medium text-red-600">{formError}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        className="btn-primary mt-5 w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending…" : submitLabel}
      </button>

      {/* A greyed-out button with no explanation reads as broken. Say which
          of the three things is still outstanding. */}
      {!ready && !submitting ? (
        <p className="mt-2.5 text-center text-xs font-medium text-navy-500">
          {missing.length === 1
            ? `Still needed: ${missing[0]}`
            : `Still needed: ${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`}
        </p>
      ) : null}

      <ul className="mt-6 space-y-2 border-t border-navy-100 pt-5">
        {ASSURANCES.map((a) => (
          <li key={a.text} className="flex items-start gap-2.5 text-xs leading-relaxed text-navy-600">
            <Icon name={a.icon} className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
            <span>{a.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
