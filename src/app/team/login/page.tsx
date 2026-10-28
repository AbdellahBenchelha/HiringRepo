import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/teamAuth";
import { Logo } from "@/components/layout/Logo";
import { LoginForm } from "@/components/team/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function TeamLoginPage() {
  if (await getMemberSession()) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Logo className="h-10 w-10" />
          <div>
            <p className="font-display text-xl font-extrabold leading-none text-navy-900">WorkRoute</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Team portal</p>
          </div>
        </div>
        <div className="card">
          <h1 className="font-display text-2xl font-extrabold text-navy-900">Sign in</h1>
          <p className="mt-1 text-sm text-navy-500">
            Use the personal email address you applied with. We will email you a 6-digit code — there is no password.
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-navy-400">
          WorkRoute will never ask for your card number, PIN or online-banking password.
        </p>
      </div>
    </div>
  );
}
