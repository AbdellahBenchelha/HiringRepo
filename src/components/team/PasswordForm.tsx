"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { problemOf, teamPost } from "@/lib/teamClient";
import { PASSWORD_MIN } from "@/lib/teamPassword";
import { Icon } from "@/components/Icon";

/**
 * Setting a password: at first sign-in (`mode="first"`, no current password)
 * or from Profile (`mode="change"`, the current one is required).
 */
export function PasswordForm({ mode }: { mode: "first" | "change" }) {
  const router = useRouter();
  const first = mode === "first";
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < PASSWORD_MIN;
  const mismatch = confirm.length > 0 && confirm !== password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await teamPost("/api/team/password", first ? { password, confirm } : { current, password, confirm });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      if (first) {
        router.replace("/");
        router.refresh();
      } else {
        setDone(true);
        setCurrent("");
        setPassword("");
        setConfirm("");
      }
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = "input pr-12";
  const eye = (
    <button
      type="button"
      onClick={() => setShow((s) => !s)}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-navy-400 hover:bg-cream-200 hover:text-navy-900"
      aria-label={show ? "Hide passwords" : "Show passwords"}
    >
      <Icon name={show ? "shield" : "search"} className="h-4 w-4" />
    </button>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate data-password-form>
      {done ? (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-800">
          <Icon name="checkCircle" className="h-4 w-4" /> Your password was changed. Other devices have been signed out.
        </p>
      ) : null}
      {!first ? (
        <div>
          <label htmlFor="pw-current" className="label">
            Current password
          </label>
          <input id="pw-current" type={show ? "text" : "password"} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" />
        </div>
      ) : null}
      <div>
        <label htmlFor="pw-new" className="label">
          New password
        </label>
        <div className="relative">
          <input
            id="pw-new"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            aria-describedby="pw-hint"
          />
          {eye}
        </div>
        <p id="pw-hint" className={`mt-1 text-xs ${tooShort ? "text-red-600" : "text-navy-400"}`}>
          At least {PASSWORD_MIN} characters.
        </p>
      </div>
      <div>
        <label htmlFor="pw-confirm" className="label">
          Repeat new password
        </label>
        <input id="pw-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
        {mismatch ? <p className="mt-1 text-xs text-red-600">The two passwords do not match.</p> : null}
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !password || !confirm || (!first && !current) || tooShort || mismatch}
        className="btn-primary"
      >
        {busy ? "Saving…" : first ? "Set my password" : "Change password"}
      </button>
    </form>
  );
}
