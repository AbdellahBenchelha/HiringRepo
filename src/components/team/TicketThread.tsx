import type { Ticket } from "@/lib/teamStore";
import { formatDateTime } from "@/lib/teamShared";

/**
 * The messages on one ticket, oldest first, with their screenshots. Shared by
 * the portal and the Admin Panel; only where files are opened from differs.
 */
export function TicketThread({
  ticket,
  side,
  memberName,
}: {
  ticket: Ticket;
  side: "member" | "admin";
  memberName: string;
}) {
  const fileBase = side === "member" ? "/api/team/files" : "/api/admin/team/files";
  return (
    <ol className="space-y-4" data-thread>
      {ticket.messages.map((m) => {
        const mine = m.from === side;
        const who = m.from === "admin" ? (side === "admin" ? `WorkRoute (${m.by ?? "admin"})` : "WorkRoute team") : memberName;
        return (
          <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              data-from={m.from}
              className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                m.from === "admin" ? "border-navy-100 bg-navy-50" : "border-brand-200 bg-brand-50"
              }`}
            >
              <p className="mb-1 text-xs font-semibold text-navy-500">
                {who} · {formatDateTime(m.at)}
              </p>
              <p className="whitespace-pre-line break-words text-[15px] text-navy-900">{m.body}</p>
              {m.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.attachments.map((a) => {
                    const href = `${fileBase}?key=${encodeURIComponent(a.key)}`;
                    return (
                      <a key={a.key} href={href} target="_blank" rel="noopener noreferrer" className="block" title={a.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={href} alt={a.name} className="h-24 w-24 rounded-lg border border-cream-300 object-cover" loading="lazy" />
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
