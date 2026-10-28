"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { problemOf } from "@/lib/teamClient";

/** Email, then the code that was sent to it. */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function post(body: unknown) {
    return fetch("/api/team/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function askCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await post({ action: "code", email });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      setStep("code");
      setNote(`If ${email.trim()} belongs to a team member, a code is on its way. Check your inbox and spam folder.`);
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await post({ action: "verify", email, code });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={askCode} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </div>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={busy || !email.trim()} className="btn-primary w-full">
          {busy ? "Sending…" : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="mt-6 space-y-4" noValidate>
      <p className="rounded-xl bg-cream-200 p-3 text-sm text-navy-700">{note}</p>
      <div>
        <label htmlFor="login-code" className="label">
          6-digit code
        </label>
        <input
          id="login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          className="input text-center font-mono text-2xl tracking-[0.4em]"
          placeholder="••••••"
          autoFocus
        />
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || code.replace(/\D/g, "").length !== 6} className="btn-primary w-full">
        {busy ? "Checking…" : "Sign in"}
      </button>
      <div className="flex justify-between text-sm">
        <button
          type="button"
          className="font-semibold text-navy-500 hover:text-navy-900"
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
          }}
        >
          Use another email
        </button>
        <button type="button" disabled={busy} className="font-semibold text-brand-700 hover:text-brand-800" onClick={() => askCode()}>
          Send a new code
        </button>
      </div>
    </form>
  );
}
