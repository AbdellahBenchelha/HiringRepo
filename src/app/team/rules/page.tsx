import type { Metadata } from "next";
import { requireMember } from "@/lib/teamAuth";
import { getTeamSettings } from "@/lib/teamStore";
import { formatDay } from "@/lib/teamShared";
import { PortalShell } from "@/components/team/PortalShell";
import { ActionButton } from "@/components/team/ActionButton";
import { Empty } from "@/components/team/ui";

export const metadata: Metadata = { title: "Team rules" };

export default async function TeamRulesPage() {
  const member = await requireMember();
  const { rulesText } = await getTeamSettings();
  const readAt = member.onboarding?.rulesReadAt;
  return (
    <PortalShell member={member} active="profile" title="Team rules">
      <div className="card">
        {rulesText.trim() ? (
          <>
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-navy-800" data-rules>
              {rulesText}
            </div>
            <div className="mt-6 border-t border-cream-200 pt-4">
              {readAt ? (
                <p className="text-sm text-green-700">You confirmed you read the rules on {formatDay(readAt.slice(0, 10))}.</p>
              ) : (
                <ActionButton url="/api/team/account" body={{ action: "rules_read" }}>
                  I have read the rules
                </ActionButton>
              )}
            </div>
          </>
        ) : (
          <Empty>No rules have been published yet.</Empty>
        )}
      </div>
    </PortalShell>
  );
}
