"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    try {
      await fetch("/api/team/logout", { method: "POST" });
    } catch {
      /* the cookie goes either way on the next sign-in */
    }
    router.replace("/login");
    router.refresh();
  }
  return (
    <button type="button" onClick={signOut} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
      Sign out
    </button>
  );
}
