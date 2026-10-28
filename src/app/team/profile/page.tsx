import type { Metadata } from "next";
import { requireMember } from "@/lib/teamAuth";
import { getTeamSettings } from "@/lib/teamStore";
import { formatDateTime, formatDay } from "@/lib/teamShared";
import { formatDays, formatWindow, windowInCompanyTime } from "@/lib/availability";
import { PortalShell } from "@/components/team/PortalShell";
import { ActionButton } from "@/components/team/ActionButton";
import { Section } from "@/components/team/ui";
import { CopyButton } from "@/components/admin/CopyButton";

export const metadata: Metadata = { title: "Profile" };

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 border-t border-cream-200 py-3 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm text-navy-400">{label}</dt>
      <dd className="text-sm font-semibold text-navy-900">{value || <span className="font-normal text-navy-400">—</span>}</dd>
    </div>
  );
}

export default async function TeamProfilePage() {
  const member = await requireMember();
  const settings = await getTeamSettings();
  const o = member.onboarding ?? {};

  return (
    <PortalShell member={member} active="profile" title="Your profile" intro="Something wrong? Open a ticket and we will correct it.">
      <div className="space-y-6">
        <Section
          title="Your details"
          action={
            o.profileConfirmedAt ? (
              <span className="text-sm text-green-700">Confirmed {formatDay(o.profileConfirmedAt.slice(0, 10))}</span>
            ) : (
              <ActionButton url="/api/team/account" body={{ action: "confirm_profile" }}>
                My details are correct
              </ActionButton>
            )
          }
        >
          <dl>
            <Row label="Full name" value={member.fullName} />
            <Row label="Position" value={member.position} />
            <Row label="Country" value={member.country} />
            <Row label="Personal email (sign-in)" value={member.loginEmail} />
            <Row label="Personal phone" value={member.personalPhone} />
            <Row label="Joined the team" value={formatDay(member.createdAt.slice(0, 10))} />
            <Row label="First work day" value={formatDay(member.firstWorkDay)} />
          </dl>
        </Section>

        <section id="mailbox" className="card scroll-mt-6">
          <h2 className="font-display text-lg font-extrabold text-navy-900">Your professional email</h2>
          {member.workEmail ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="font-mono text-lg font-semibold text-navy-900" data-work-email>
                  {member.workEmail}
                </p>
                <CopyButton text={member.workEmail} title="Copy your professional email" />
              </div>
              {settings.mailboxHelp ? <p className="mt-3 whitespace-pre-line text-sm text-navy-600">{settings.mailboxHelp}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {settings.mailboxUrl ? (
                  <a href={settings.mailboxUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    Open my mailbox
                  </a>
                ) : null}
                {o.mailboxOpenedAt ? (
                  <span className="text-sm text-green-700">You opened your mailbox — thank you.</span>
                ) : (
                  <ActionButton url="/api/team/account" body={{ action: "mailbox_opened" }}>
                    I have opened my mailbox
                  </ActionButton>
                )}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-navy-500">
              Your @workroute.team address is being set up. It will appear here, and we will tell you how to open it.
            </p>
          )}
        </section>

        <Section title="Your schedule">
          <dl>
            <Row label="Work days" value={formatDays(member.schedule.days)} />
            <Row label={`Your time (${member.schedule.timeZone})`} value={formatWindow(member.schedule)} />
            <Row label="UK time" value={windowInCompanyTime(member.schedule)} />
          </dl>
        </Section>

        <Section
          title="Sign-in activity"
          action={
            <ActionButton
              url="/api/team/account"
              body={{ action: "signout_all" }}
              className="btn-secondary"
              confirm="Sign out of every device, including this one?"
              after="/login"
            >
              Sign out of every device
            </ActionButton>
          }
        >
          <p className="mb-3 text-sm text-navy-500">If you see a sign-in you do not recognise, sign out of every device and open a ticket.</p>
          <ul className="divide-y divide-cream-200 text-sm" data-signins>
            {(member.signIns ?? []).slice(0, 10).map((s) => (
              <li key={s.at} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-semibold text-navy-900">{s.device}</span>
                <span className="text-navy-500">
                  {formatDateTime(s.at)} · IP {s.ip}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </PortalShell>
  );
}
