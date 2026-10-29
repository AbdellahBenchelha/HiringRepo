import Link from "next/link";
import { formatAddress, type MailMessage } from "@/lib/teamMail";
import { formatDateTime } from "@/lib/teamShared";
import { Icon } from "@/components/Icon";

/** A list of emails, for the portal and the team admin panel alike. */
export function MailList({ messages, hrefFor, empty }: { messages: MailMessage[]; hrefFor: (m: MailMessage) => string; empty: string }) {
  if (!messages.length) return <p className="rounded-xl bg-cream-100 p-4 text-sm text-navy-500">{empty}</p>;
  return (
    <ul className="divide-y divide-cream-200 overflow-hidden rounded-2xl border border-cream-300 bg-white" data-mail-list>
      {messages.map((m) => {
        const who = m.folder === "sent" ? `To: ${m.to.map((a) => a.name || a.address).join(", ")}` : m.from.name || m.from.address;
        return (
          <li key={m.id}>
            <Link
              href={hrefFor(m)}
              data-mail-row={m.read ? "read" : "unread"}
              className={`block px-4 py-3 transition hover:bg-cream-100 ${m.read ? "" : "bg-brand-50/60"}`}
            >
              <div className="flex items-center gap-2">
                {!m.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" /> : null}
                <p className={`min-w-0 flex-1 truncate text-sm ${m.read ? "text-navy-700" : "font-bold text-navy-900"}`} title={formatAddress(m.from)}>
                  {who}
                </p>
                {m.attachments.length ? <Icon name="document" className="h-4 w-4 shrink-0 text-navy-400" /> : null}
                {m.status === "failed" ? <span className="rounded-full bg-red-100 px-2 text-[11px] font-semibold text-red-700">Not sent</span> : null}
                <p className="shrink-0 text-xs text-navy-400">{formatDateTime(m.at)}</p>
              </div>
              <p className={`mt-0.5 truncate text-sm ${m.read ? "text-navy-700" : "font-semibold text-navy-900"}`}>{m.subject}</p>
              <p className="truncate text-xs text-navy-400">{m.snippet}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
