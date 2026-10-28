import type { Metadata } from "next";
import { requireMember } from "@/lib/teamAuth";
import { getWork } from "@/lib/teamStore";
import { localDate } from "@/lib/teamHours";
import { formatDay, formatMonth } from "@/lib/teamShared";
import { PortalShell } from "@/components/team/PortalShell";
import { Empty, Section } from "@/components/team/ui";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Documents" };

/** Every month from the first work day (or first record) to this one, newest first. */
function months(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  while ((y < ty || (y === ty && m <= tm)) && out.length < 120) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out.reverse();
}

export default async function TeamDocumentsPage() {
  const member = await requireMember();
  const work = await getWork(member.id);
  const today = localDate(member.schedule.timeZone);
  const earliest = [member.firstWorkDay, ...work.entries.map((e) => e.date), ...work.payments.map((p) => p.date)].sort()[0];
  const list = earliest <= today ? months(earliest, today) : [];
  const docs = member.documents ?? [];

  const link = (href: string, label: string, sub?: string) => (
    <a href={href} className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white p-3 transition hover:border-brand-300">
      <Icon name="document" className="h-5 w-5 shrink-0 text-brand-700" />
      <span className="min-w-0">
        <span className="block font-semibold text-navy-900">{label}</span>
        {sub ? <span className="block text-xs text-navy-400">{sub}</span> : null}
      </span>
      <span className="ml-auto text-xs font-semibold text-brand-700">Download</span>
    </a>
  );

  return (
    <PortalShell member={member} active="documents" title="Documents">
      <div className="space-y-6">
        <Section title="Shared with you">
          {docs.length ? (
            <div className="grid gap-2 sm:grid-cols-2" data-shared-docs>
              {docs.map((d) => (
                <a
                  key={d.id}
                  href={`/api/team/files?key=${encodeURIComponent(d.key)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-cream-300 bg-white p-3 transition hover:border-brand-300"
                >
                  <Icon name="document" className="h-5 w-5 shrink-0 text-brand-700" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-navy-900">{d.name}</span>
                    <span className="block text-xs text-navy-400">Added {formatDay(d.at.slice(0, 10))}</span>
                  </span>
                  <span className="ml-auto text-xs font-semibold text-brand-700">Open</span>
                </a>
              ))}
            </div>
          ) : (
            <Empty>Documents the team shares with you — like your signed agreement — appear here.</Empty>
          )}
        </Section>

        <Section title="Your offer">
          {link("/api/team/offer-summary", "Offer summary (PDF)", "Your position, rate, hours and schedule")}
        </Section>

        <Section title="Monthly statements">
          {list.length ? (
            <div className="grid gap-2 sm:grid-cols-2" data-statements>
              {list.map((m) => (
                <div key={m}>{link(`/api/team/statement?month=${m}`, formatMonth(m), "Hours, earnings and payments (PDF)")}</div>
              ))}
            </div>
          ) : (
            <Empty>Your first statement will be here once your first work day has started.</Empty>
          )}
        </Section>
      </div>
    </PortalShell>
  );
}
