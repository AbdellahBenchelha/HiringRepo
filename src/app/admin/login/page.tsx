"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-9 w-auto" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Admin Panel</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-navy-900">Sign in</h1>
            <p className="mt-1 text-sm text-navy-500">Enter your administrator credentials.</p>
          </div>

          <div>
            <label htmlFor="username" className="label">Username</label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {status === "error" ? (
            <p role="alert" className="text-sm font-medium text-red-600">
              Invalid username or password.
            </p>
          ) : null}

          <button type="submit" disabled={status === "submitting"} className="btn-primary w-full">
            {status === "submitting" ? "Signing in…" : "Sign In"}
            {status !== "submitting" ? <Icon name="arrowRight" className="h-4 w-4" /> : null}
          </button>
        </form>
      </div>
    </div>
  );
}
