import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMemberForPassword } from "@/lib/teamAuth";
import { Logo } from "@/components/layout/Logo";
import { SignOutButton } from "@/components/team/SignOutButton";
import { PasswordForm } from "@/components/team/PasswordForm";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Choose your password" };

export default async function SetPasswordPage() {
  const member = await requireMemberForPassword();
  // Only for a temporary password; otherwise the portal is open as usual.
  if (!member.mustChangePassword) redirect("/");

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
          <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Icon name="shieldCheck" className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-extrabold text-navy-900">Choose your password</h1>
          <p className="mt-1 text-sm text-navy-500">
            You signed in with a temporary password. Please choose your own now. You will use it every time you sign in.
          </p>
          <div className="mt-6">
            <PasswordForm mode="first" />
          </div>
        </div>
        <div className="mt-4 text-center">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
