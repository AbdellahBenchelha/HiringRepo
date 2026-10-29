"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { problemOf } from "@/lib/teamClient";
import { Icon } from "@/components/Icon";

/** Professional email and password. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/team/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError(await problemOf(res));
        return;
      }
      const data = (await res.json()) as { mustChange?: boolean };
      router.replace(data.mustChange ? "/set-password" : "/");
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <div>
        <label htmlFor="login-email" className="label">
          Professional email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@workroute.team"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="label">
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input pr-12"
            placeholder="Your password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-navy-400 hover:bg-cream-200 hover:text-navy-900"
            aria-label={show ? "Hide password" : "Show password"}
          >
            <Icon name={show ? "eyeOff" : "eye"} className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !email.trim() || !password} className="btn-primary w-full">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="rounded-xl bg-cream-100 p-3 text-center text-xs text-navy-500">
        Forgot your password? Please contact your manager and we will send it to you.
      </p>
    </form>
  );
}
