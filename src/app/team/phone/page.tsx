import type { Metadata } from "next";
import { requireMember } from "@/lib/teamAuth";
import { listPhoneMessages } from "@/lib/teamStore";
import { PortalShell } from "@/components/team/PortalShell";
import { PhoneInbox } from "@/components/team/PhoneInbox";
import { CopyButton } from "@/components/admin/CopyButton";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Phone" };

export default async function TeamPhonePage() {
  const member = await requireMember();
  const messages = (await listPhoneMessages(member.id)).slice(0, 100).map(({ by: _by, memberId: _m, ...m }) => m);
  return (
    <PortalShell member={member} active="phone" title="Your work phone number">
      <div className="space-y-6">
        <div className="card flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Icon name="phone" className="h-6 w-6" />
          </span>
          {member.phoneNumber ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Your number</p>
                <p className="font-mono text-2xl font-bold text-navy-900" data-phone-number>
                  {member.phoneNumber}
                </p>
              </div>
              <CopyButton text={member.phoneNumber.replace(/[\s()-]/g, "")} label="Copy number" title="Copy your work number" />
            </>
          ) : (
            <p className="text-sm text-navy-500">Your work number is being set up. It will appear here.</p>
          )}
        </div>
        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold text-navy-900">Messages</h2>
          <PhoneInbox initial={messages} />
          <p className="mt-4 text-xs text-navy-400">
            Messages are added by the WorkRoute team. Use a code only to sign in to your own work account, and never share it with anyone.
          </p>
        </section>
      </div>
    </PortalShell>
  );
}
