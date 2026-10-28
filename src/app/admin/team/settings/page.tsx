import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { getTeamSettings, listAnnouncements } from "@/lib/teamStore";
import { formatDateTime } from "@/lib/teamShared";
import { TeamSettingsForm } from "@/components/admin/team/TeamSettingsForm";
import { AdminAction, AdminForm } from "@/components/admin/team/AdminAction";
import { Empty, Section } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team settings", robots: { index: false, follow: false } };

export default async function AdminTeamSettingsPage() {
  await requireAdmin();
  const [settings, announcements] = await Promise.all([getTeamSettings(), listAnnouncements()]);
  return (
    <AdminShell>
      <header className="mb-6">
        <p className="text-sm">
          <Link href="/admin/team" className="font-semibold text-navy-500 hover:text-navy-900">
            ← Team
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-navy-900 sm:text-3xl">Team settings & announcements</h1>
      </header>
      <div className="space-y-6">
        <Section title="Announcements">
          <p className="mb-3 text-sm text-navy-500">Shown at the top of every member&rsquo;s portal until they hide it. The newest three active ones are shown.</p>
          <AdminForm
            url="/api/admin/team/settings"
            body={{ action: "announce" }}
            submit="Publish"
            done="Published."
            fields={[
              { name: "title", label: "Title", placeholder: "e.g. Payday is Friday", wide: true },
              { name: "body", label: "Message (optional)", type: "textarea" },
            ]}
          />
          <ul className="mt-5 divide-y divide-navy-100 text-sm" data-announcements-admin>
            {announcements.length ? (
              announcements.map((a) => (
                <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900">
                      {a.title}{" "}
                      <span className={`ml-1 text-xs ${a.active ? "text-green-700" : "text-navy-400"}`}>{a.active ? "Shown" : "Hidden"}</span>
                    </p>
                    {a.body ? <p className="whitespace-pre-line text-navy-600">{a.body}</p> : null}
                    <p className="text-xs text-navy-400">
                      {formatDateTime(a.createdAt)} · {a.by}
                    </p>
                  </div>
                  <span className="flex gap-2">
                    <AdminAction url="/api/admin/team/settings" body={{ action: "announcement", id: a.id, active: !a.active }}>
                      {a.active ? "Hide" : "Show again"}
                    </AdminAction>
                    <AdminAction url="/api/admin/team/settings" body={{ action: "announcement", id: a.id, remove: true }} confirm="Delete this announcement?">
                      Delete
                    </AdminAction>
                  </span>
                </li>
              ))
            ) : (
              <li>
                <Empty>No announcements yet.</Empty>
              </li>
            )}
          </ul>
        </Section>
        <Section title="Settings">
          <TeamSettingsForm initial={settings} />
        </Section>
      </div>
    </AdminShell>
  );
}
