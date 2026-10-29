import Link from "next/link";
import { formatAddress, type MailAddress, type MailMessage } from "@/lib/teamMail";
import { formatDateTime, formatMailDate } from "@/lib/teamShared";
import { Icon } from "@/components/Icon";

const AVATAR_TONES = [
  "bg-navy-900 text-white",
  "bg-brand-400 text-navy-900",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-cream-300 text-navy-800",
];

/** The sender's initials in a colour of their own — the same colour every time. */
export function MailAvatar({ who, size = "md" }: { who: MailAddress; size?: "md" | "lg" }) {
  const label = (who.name || who.address.split("@")[0]).trim();
  const words = label.split(/[\s._-]+/).filter(Boolean);
  const initials = ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  let hash = 0;
  for (const c of who.address.toLowerCase()) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold ${
        size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm"
      } ${AVATAR_TONES[hash % AVATAR_TONES.length]}`}
    >
      {initials}
    </span>
  );
}

/** A list of emails, for the portal and the team admin panel alike. */
export function MailList({
  messages,
  hrefFor,
  empty,
  timeZone,
  framed = true,
}: {
  messages: MailMessage[];
  hrefFor: (m: MailMessage) => string;
  empty: string;
  timeZone?: string;
  /** Its own border and background; off inside the portal's mailbox frame. */
  framed?: boolean;
}) {
  const frame = framed ? "overflow-hidden rounded-2xl border border-cream-300 bg-white" : "";
  if (!messages.length) {
    return (
      <div className={`flex flex-col items-center px-6 py-16 text-center ${frame}`} data-mail-empty>
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
          <Icon name="inbox" className="h-8 w-8" />
        </span>
        <p className="mt-4 max-w-sm text-sm text-navy-500">{empty}</p>
      </div>
    );
  }
  const now = new Date();
  return (
    <ul className={`divide-y divide-cream-200 ${frame}`} data-mail-list>
      {messages.map((m) => {
        const sent = m.folder === "sent";
        const person = sent ? m.to[0] ?? m.from : m.from;
        const who = sent ? `To: ${m.to.map((a) => a.name || a.address).join(", ")}` : m.from.name || m.from.address;
        return (
          <li key={m.id}>
            <Link
              href={hrefFor(m)}
              data-mail-row={m.read ? "read" : "unread"}
              className={`group relative flex gap-3 px-4 py-3.5 transition hover:bg-cream-100 sm:px-5 ${m.read ? "" : "bg-brand-50/50"}`}
            >
              {!m.read ? <span className="absolute inset-y-0 left-0 w-1 bg-brand-500" aria-hidden="true" /> : null}
              <MailAvatar who={person} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className={`min-w-0 flex-1 truncate text-sm ${m.read ? "text-navy-700" : "font-bold text-navy-900"}`} title={formatAddress(sent ? person : m.from)}>
                    {!m.read ? <span className="sr-only">Unread: </span> : null}
                    {who}
                  </p>
                  {m.attachments.some((a) => !a.contentId) ? (
                    <Icon name="paperclip" className="h-4 w-4 shrink-0 self-center text-navy-400" title="Has attachments" />
                  ) : null}
                  {m.status === "failed" ? (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Not sent</span>
                  ) : null}
                  <time dateTime={m.at} title={formatDateTime(m.at, timeZone)} className={`shrink-0 text-xs ${m.read ? "text-navy-400" : "font-bold text-brand-700"}`}>
                    {formatMailDate(m.at, timeZone, now)}
                  </time>
                </div>
                <p className={`mt-0.5 truncate text-sm ${m.read ? "text-navy-700" : "font-semibold text-navy-900"}`}>{m.subject}</p>
                <p className="truncate text-[13px] text-navy-400">{m.snippet}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
