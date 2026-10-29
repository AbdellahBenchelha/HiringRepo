import type { Metadata } from "next";
import { requireMember } from "@/lib/teamAuth";
import { listPhoneMessages } from "@/lib/teamStore";
import { PortalShell } from "@/components/team/PortalShell";
import { PhoneInbox } from "@/components/team/PhoneInbox";

export const metadata: Metadata = { title: "Phone" };

export default async function TeamPhonePage() {
  const member = await requireMember();
  const messages = (await listPhoneMessages(member.id)).slice(0, 100).map(({ by: _by, memberId: _m, ...m }) => m);
  return (
    <PortalShell member={member} active="phone" title="Your work phone number">
      <PhoneInbox phoneNumber={member.phoneNumber} initial={messages} />
    </PortalShell>
  );
}
