"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Field, TextInput } from "@/components/forms/fields";
import {
  COMPANY_DOC_HINT,
  US_STATES,
  formatEin,
  validateCompanyDetails,
} from "@/lib/companyDetails";
import { COMPANY_MIME, DOCUMENT_LABEL, MAX_IMAGE_BYTES } from "@/lib/documents";

/**
 * Where a candidate confirms the company their agreement will be made with.
 *
 * They gave us a name and a number in two boxes while accepting an offer, in a
 * hurry, from a phone. That is a claim. This is where it becomes something a
 * contract can be built on: the details typed again with the paperwork in
 * front of them, and the paperwork itself, so the two can be compared.
 *
 * The W-9 leads because it carries the name, the EIN and the address certified
 * under penalty of perjury — everything typed above it becomes a cross-check
 * rather than the only evidence.
 */

type Kind = "w9" | "formation" | "einLetter";
type UploadState = "empty" | "uploading" | "done" | "error";

const DOCS: { kind: Kind; required: boolean }[] = [
  { kind: "w9", required: true },
  { kind: "formation", required: true },
  { kind: "einLetter", required: false },
];

export interface CompanyFormProps {
  token: string;
  candidateId: string;
  initial: {
    companyName: string;
    companyNumber: string;
  };
  /** Which documents are already on file, so a returning candidate is not asked twice. */
  already: Kind[];
}

export function CompanyDetailsForm({ token, candidateId, initial, already }: CompanyFormProps) {
  const [companyName, setCompanyName] = useState(initial.companyName);
  const [companyNumber, setCompanyNumber] = useState(initial.companyNumber);
  const [ein, setEin] = useState("");
  const [street, setStreet] = useState("");
  const [suite, setSuite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [states, setStates] = useState<Record<string, UploadState>>(
    Object.fromEntries(already.map((k) => [k, "done" as UploadState])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [done, setDone] = useState(false);

  // Recorded from the browser, never the server render: a mail scanner
  // following the link must not count as the candidate opening it.
  useEffect(() => {
    void fetch("/api/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: token, phase: "opened" }),
    }).catch(() => {
      /* bookkeeping only */
    });
  }, [token]);

  function details() {
    return { companyName, companyNumber, ein, street, suite, city, state, zip };
  }

  async function upload(kind: Kind, file: File | null) {
    if (!file) return;
    setErrors((e) => ({ ...e, [kind]: "" }));

    if (!(COMPANY_MIME as readonly string[]).includes(file.type)) {
      setErrors((e) => ({ ...e, [kind]: "Please choose a PDF, JPG or PNG." }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((e) => ({ ...e, [kind]: "That file is too large — 5 MB is the limit." }));
      return;
    }

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
      if (res.status === 429) {
        const mins = Math.ceil(Number(res.headers.get("Retry-After") ?? 600) / 60);
        setErrors((e) => ({
          ...e,
          [kind]: `Too many attempts. Please wait about ${mins} minute${mins === 1 ? "" : "s"} and try again.`,
        }));
        setStates((s) => ({ ...s, [kind]: "error" }));
        return;
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
      // Anything but a clean result is a failure. A file that was quarantined
      // is not on the record, and telling somebody it arrived would leave them
      // waiting for an agreement that cannot be drawn up.
      if (result.status !== "clean") {
        setErrors((e) => ({ ...e, [kind]: result.reason ?? "That file was not accepted." }));
        setStates((s) => ({ ...s, [kind]: "error" }));
        return;
      }
      setStates((s) => ({ ...s, [kind]: "done" }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[company] ${kind} upload failed`, err);
      setErrors((e) => ({
        ...e,
        [kind]: "Upload failed. Please check your connection and try again.",
      }));
      setStates((s) => ({ ...s, [kind]: "error" }));
    }
  }

  async function submit() {
    if (busy) return;
    setFailed("");

    const check = validateCompanyDetails(details());
    const found = check.ok ? [] : check.problems;
    for (const { kind, required } of DOCS) {
      if (required && states[kind] !== "done") {
        found.push(`${DOCUMENT_LABEL[kind]} is required.`);
      }
    }
    setProblems(found);
    if (found.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, details: details() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; problems?: string[] };
      if (data.ok) setDone(true);
      else if (data.problems?.length) {
        setProblems(data.problems);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setFailed(messageFor(data.error));
      }
    } catch {
      setFailed("We could not reach the server. Please check your connection and try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Icon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-navy-900">Thank you — we have your details</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
          Our team will check them against your documents and prepare your agreement in the
          company&rsquo;s name. If anything does not match, we will email you rather than guess.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {problems.length > 0 ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">Please check the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {failed ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {failed}
        </div>
      ) : null}

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900">Your company</h2>
        <p className="mt-1 text-sm text-navy-500">
          Pre-filled with what you told us when you accepted. Please correct anything that is not
          exactly as it appears on your formation document.
        </p>

        <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Company name" htmlFor="companyName" required className="sm:col-span-2">
            <TextInput
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              autoComplete="organization"
            />
          </Field>

          <Field
            label="Company number"
            htmlFor="companyNumber"
            required
            hint="The filing number your state issued."
          >
            <TextInput
              id="companyNumber"
              value={companyNumber}
              onChange={(e) => setCompanyNumber(e.target.value)}
            />
          </Field>
          <Field label="EIN" htmlFor="ein" required hint="Nine digits, like 12-3456789.">
            <TextInput
              id="ein"
              value={ein}
              onChange={(e) => setEin(formatEin(e.target.value))}
              inputMode="numeric"
              placeholder="12-3456789"
            />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900">Registered address</h2>
        <p className="mt-1 text-sm text-navy-500">
          The address on your formation document, which the agreement and your invoices will carry.
        </p>

        <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Street address" htmlFor="street" required>
            <TextInput
              id="street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              autoComplete="address-line1"
            />
          </Field>
          <Field label="Suite / unit" htmlFor="suite" optional>
            <TextInput
              id="suite"
              value={suite}
              onChange={(e) => setSuite(e.target.value)}
              autoComplete="address-line2"
            />
          </Field>

          <Field label="City" htmlFor="city" required>
            <TextInput
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" htmlFor="state" required>
              <select
                id="state"
                className="select"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ZIP code" htmlFor="zip" required>
              <TextInput
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                inputMode="numeric"
                placeholder="90210"
                autoComplete="postal-code"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-navy-900">Company documents</h2>
        <p className="mt-1 text-sm text-navy-500">
          PDF, JPG or PNG. A clear photograph of a printed page is fine.
        </p>

        <div className="mt-5 space-y-4">
          {DOCS.map(({ kind, required }) => {
            const state = states[kind] ?? "empty";
            const error = errors[kind];
            return (
              <div
                key={kind}
                className={`rounded-2xl border-2 p-4 transition ${
                  error
                    ? "border-red-300 bg-red-50/40"
                    : state === "done"
                      ? "border-green-300 bg-green-50/40"
                      : "border-dashed border-navy-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-900">
                      {DOCUMENT_LABEL[kind]}
                      {required ? (
                        <span className="text-red-600"> *</span>
                      ) : (
                        <span className="font-normal text-navy-400"> (optional)</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-navy-600">
                      {COMPANY_DOC_HINT[kind]}
                    </p>
                  </div>

                  <label className="shrink-0 cursor-pointer">
                    <span className="sr-only">Choose {DOCUMENT_LABEL[kind]}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      disabled={state === "uploading" || busy}
                      onChange={(e) => void upload(kind, e.target.files?.[0] ?? null)}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                        state === "done"
                          ? "border border-green-300 bg-white text-green-700"
                          : "bg-navy-900 text-white hover:bg-navy-800"
                      }`}
                    >
                      <Icon
                        name={state === "done" ? "checkCircle" : "upload"}
                        className="h-3.5 w-3.5"
                      />
                      {state === "uploading"
                        ? "Uploading…"
                        : state === "done"
                          ? "Replace"
                          : "Choose file"}
                    </span>
                  </label>
                </div>

                {state === "done" ? (
                  <p className="mt-2 text-xs font-medium text-green-700">Received.</p>
                ) : null}
                {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-6">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          <Icon name="checkCircle" className="h-4 w-4" />
          {busy ? "Sending…" : "Confirm company details"}
        </button>
        <p className="mt-4 text-xs text-navy-400">
          We will never ask you for a payment, a bank card, or a password. Your bank details are
          needed only after your agreement has been signed.
        </p>
      </div>
    </div>
  );
}

function messageFor(error?: string): string {
  switch (error) {
    case "missing_documents":
      return "One of the required documents did not arrive. Please attach it again.";
    case "not_a_company":
      return "Our records show you accepted in your own name. Please reply to your email and we will sort it out.";
    case "expired":
      return "This link has expired. Reply to the email we sent you and we will send a new one.";
    case "invalid":
      return "This link is not valid. Please use the link exactly as it appears in your email.";
    default:
      return "Something went wrong and your details were not saved. Please try again, or reply to your email.";
  }
}
