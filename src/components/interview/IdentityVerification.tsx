"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { siteConfig } from "@/config/site";
import { IMAGE_MIME, MAX_IMAGE_BYTES, type DocumentKind } from "@/lib/documents";

/**
 * The step a candidate reaches after their assessment, where required.
 *
 * Their result is already scored and saved by the time this renders — this
 * never gates the assessment itself, only what happens next. There is no skip
 * control: for a listed country this is required, and offering a way past it
 * would make it optional in practice.
 *
 * A closed browser cannot be prevented, so the assessment link keeps working
 * and returns here. Someone whose phone dies halfway must be able to come back
 * rather than being locked out of their own application.
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
  step: string;
  title: string;
  hint: string;
}

const SLOTS: Slot[] = [
  {
    kind: "identity",
    step: "1",
    title: "Your ID document",
    hint: "Passport, national ID card or driver's licence. All four corners visible, text readable.",
  },
  {
    kind: "selfie",
    step: "2",
    title: "A photo of you holding it",
    hint: "Your face and the ID in the same picture, both clearly visible. A phone selfie is fine.",
  },
];

/** What we promise about these images, in the place where it is being asked. */
const ASSURANCES: { icon: "shield" | "users" | "checkCircle"; text: string }[] = [
  { icon: "shield", text: "Stored privately — nobody can open them without signing in" },
  { icon: "users", text: "Seen only by our recruitment team" },
  { icon: "checkCircle", text: "Used only to confirm who you are, never shared onward" },
];

export function IdentityVerification({
  candidateId,
  fullName,
}: {
  candidateId: string;
  fullName?: string;
}) {
  const [files, setFiles] = useState<Partial<Record<DocumentKind, File>>>({});
  const [states, setStates] = useState<Partial<Record<DocumentKind, SlotState>>>({});
  const [errors, setErrors] = useState<Partial<Record<DocumentKind, string>>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
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

  async function submit() {
    const identity = files.identity;
    const selfie = files.selfie;
    if (!identity || !selfie || !consent || submitting) return;

    setSubmitting(true);
    setFormError("");

    await fetch("/api/applications/verification-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: candidateId }),
    }).catch(() => {});

    const a = await uploadOne("identity", identity);
    const b = await uploadOne("selfie", selfie);

    setSubmitting(false);
    if (a && b) setDone(true);
    else setFormError("Some photos did not go through. Please fix the ones marked below and try again.");
  }

  const ready = !!files.identity && !!files.selfie && consent && !submitting;
  const missing = [
    !files.identity && "your ID document",
    !files.selfie && "a photo of you holding it",
    !consent && "your consent",
  ].filter((m): m is string => typeof m === "string");

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <Icon name="checkCircle" className="h-9 w-9 text-green-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-navy-900 sm:text-3xl">Verification received</h1>
        <p className="mt-4 leading-relaxed text-navy-600">
          Thank you{fullName ? `, ${fullName.split(" ")[0]}` : ""}. Our team will review your
          documents and be in touch about the next step.
        </p>
        <p className="mt-6 text-sm text-navy-400">You can close this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 flex justify-center">
          <Logo className="h-9 w-auto" />
        </div>

        <div className="card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <Icon name="shield" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                Assessment submitted
              </p>
              <h1 className="mt-1 text-2xl font-bold text-navy-900">One last step</h1>
              <p className="mt-2 leading-relaxed text-navy-600">
                Before we can continue with your application, we need to confirm your identity.
                This takes about a minute.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {SLOTS.map((slot) => {
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
                        slot.step
                      )}
                    </span>
                    <p className="text-sm font-bold text-navy-900">{slot.title}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-navy-600">{slot.hint}</p>

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
                          <span className="text-[11px] font-medium text-navy-400">
                            JPG or PNG
                          </span>
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
              I consent to {siteConfig.company.name} processing these images to verify my identity,
              as described in the{" "}
              <a href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">
                privacy policy
              </a>
              .
            </span>
          </label>

          {formError ? (
            <p className="mt-3 text-sm font-medium text-red-600">{formError}</p>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className="btn-primary mt-5 w-full !py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit for verification"}
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
      </div>
    </div>
  );
}
