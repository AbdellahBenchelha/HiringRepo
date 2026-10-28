import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { listMembers, listPhoneMessages } from "@/lib/teamStore";
import { formatDateTime } from "@/lib/teamShared";
import { PhoneSendPanel } from "@/components/admin/team/PhoneSendPanel";
import { AdminDelete } from "@/components/admin/team/AdminAction";
import { Empty, Section } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team phone", robots: { index: false, follow: false } };

export default async function AdminTeamPhonePage() {
  await requireAdmin();
  const [members, messages] = await Promise.all([listMembers(), listPhoneMessages()]);
  const withNumber = members
    .filter((m) => m.phoneNumber && m.status !== "left")
    .map((m) => ({ id: m.id, fullName: m.fullName, phoneNumber: m.phoneNumber! }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const names = new Map(members.map((m) => [m.id, m.fullName]));
  const missing = members.filter((m) => !m.phoneNumber && m.status !== "left");

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Team phone</h1>
        <p className="mt-1 text-sm text-navy-500">
          Pass on a message that arrived on a member&rsquo;s work number. It shows in their Phone inbox, with a Copy code button when it
          carries a code.
        </p>
      </header>
      <div className="space-y-6">
        <Section title="Send a message">
          {withNumber.length ? <PhoneSendPanel members={withNumber} /> : <Empty>No member has a work number yet. Add one on their Team page.</Empty>}
          {missing.length ? (
            <p className="mt-4 text-xs text-navy-500">
              Without a number yet:{" "}
              {missing.map((m, i) => (
                <span key={m.id}>
                  {i ? ", " : ""}
                  <Link href={`/admin/team/${m.id}`} className="font-semibold hover:underline">
                    {m.fullName}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </Section>
        <Section title="Recent messages">
          {messages.length ? (
            <ul className="divide-y divide-navy-100 text-sm" data-admin-phone-all>
              {messages.slice(0, 100).map((p) => (
                <li key={p.id} className="py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/team/${p.memberId}?tab=phone`} className="font-semibold text-navy-900 hover:underline">
                      {names.get(p.memberId) ?? "Unknown"}
                    </Link>
                    <span className="text-xs text-navy-500">
                      {p.number} · from <strong>{p.sender}</strong> · {formatDateTime(p.at)} · {p.readAt ? "read" : "not read yet"}
                    </span>
                    <span className="ml-auto">
                      <AdminDelete url={`/api/admin/team/phone?id=${p.id}`} confirm="Delete this message from their inbox?" />
                    </span>
                  </div>
                  <p className="whitespace-pre-line text-navy-700">{p.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No messages yet.</Empty>
          )}
        </Section>
      </div>
    </AdminShell>
  );
}
