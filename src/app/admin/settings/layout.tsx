import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SettingsTabs } from "@/components/admin/SettingsTabs";

/**
 * One Settings screen with three sections, rather than three sidebar items.
 *
 * The shell, the title and the tabs live here so each section is only its own
 * content — and so moving between them never repaints the frame around them.
 */
export default function AdminSettingsLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Settings</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          Rules that apply by country. Each one is a list you edit, and changes take effect
          immediately — no deploy needed.
        </p>
      </header>

      <SettingsTabs />

      {children}
    </AdminShell>
  );
}
