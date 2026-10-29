import { formatAddress, type MailMessage } from "@/lib/teamMail";
import { formatDateTime } from "@/lib/teamShared";
import { Icon } from "@/components/Icon";

/** Who, when, and the attachments of one email — portal and admin alike. */
export function MailHeader({ message: m, attachmentBase }: { message: MailMessage; attachmentBase: string }) {
  const files = m.attachments.filter((a) => !a.contentId || !a.type.startsWith("image/"));
  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-extrabold text-navy-900" data-mail-subject>
        {m.subject}
      </h2>
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-navy-400">From</dt>
          <dd className="min-w-0 break-words font-semibold text-navy-900">{formatAddress(m.from)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-navy-400">To</dt>
          <dd className="min-w-0 break-words text-navy-700">{m.to.map(formatAddress).join(", ")}</dd>
        </div>
        {m.cc.length ? (
          <div className="flex gap-2">
            <dt className="w-12 shrink-0 text-navy-400">Cc</dt>
            <dd className="min-w-0 break-words text-navy-700">{m.cc.map(formatAddress).join(", ")}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="w-12 shrink-0 text-navy-400">Date</dt>
          <dd className="text-navy-700">{formatDateTime(m.at)}</dd>
        </div>
      </dl>
      {m.status === "failed" ? (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">This email was not sent. Write it again from New email.</p>
      ) : null}
      {files.length ? (
        <ul className="flex flex-wrap gap-2" data-mail-attachments>
          {files.map((a) => (
            <li key={a.id}>
              {a.key ? (
                <a
                  href={`${attachmentBase}?id=${encodeURIComponent(m.id)}&att=${encodeURIComponent(a.id)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm text-navy-800 hover:border-brand-300"
                >
                  <Icon name="document" className="h-4 w-4 text-brand-700" />
                  {a.name}
                  <span className="text-xs text-navy-400">{Math.max(1, Math.round(a.size / 1024))} KB</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-cream-400 px-3 py-1.5 text-sm text-navy-400">
                  {a.name} — {a.dropped ?? "not kept"}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
