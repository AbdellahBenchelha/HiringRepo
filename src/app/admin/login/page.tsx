import type { Metadata } from "next";
import { headers } from "next/headers";
import { isTeamHost } from "@/lib/teamHost";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

/** One sign-in page, labelled for whichever panel this domain holds. */
export default async function AdminLoginPage() {
  const host = (await headers()).get("host");
  return <AdminLoginForm panel={isTeamHost(host) ? "team" : "hiring"} />;
}
