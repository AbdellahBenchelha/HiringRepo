import { formatAddress, type MailAttachment, type MailMessage } from "@/lib/teamMail";
import { formatDateTime, formatFileSize } from "@/lib/teamShared";
import { Icon } from "@/components/Icon";
import { MailAvatar } from "@/components/team/MailList";

/** A small coloured tag for the kind of file: PDF, DOC, XLS, IMG… */
function fileKind(a: MailAttachment): { tag: string; tone: string } {
  const ext = (a.name.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf" || a.type === "application/pdf") return { tag: "PDF", tone: "bg-red-100 text-red-700" };
  if (["doc", "docx", "odt", "rtf", "txt"].includes(ext)) return { tag: "DOC", tone: "bg-sky-100 text-sky-800" };
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return { tag: "XLS", tone: "bg-emerald-100 text-emerald-800" };
  if (["ppt", "pptx", "odp"].includes(ext)) return { tag: "PPT", tone: "bg-orange-100 text-orange-800" };
  if (a.type.startsWith("image/")) return { tag: "IMG", tone: "bg-violet-100 text-violet-800" };
  if (["zip", "rar", "7z", "gz"].includes(ext)) return { tag: "ZIP", tone: "bg-brand-100 text-brand-800" };
  return { tag: (ext || "file").slice(0, 4).toUpperCase(), tone: "bg-cream-200 text-navy-700" };
}

/** Who, when, and the attachments of one email — portal and admin alike. */
export function MailHeader({
  message: m,
  attachmentBase,
  timeZone,
}: {
  message: MailMessage;
  attachmentBase: string;
  timeZone?: string;
}) {
  const files = m.attachments.filter((a) => !a.contentId || !a.type.startsWith("image/"));
  const sent = m.folder === "sent";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-2">
        <h2 className="min-w-0 flex-1 break-words font-display text-xl font-extrabold leading-snug text-navy-900 sm:text-2xl" data-mail-subject>
          {m.subject}
        </h2>
        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-cream-200 px-2.5 py-0.5 text-xs font-semibold text-navy-600">
          <Icon name={sent ? "send" : "inbox"} className="h-3 w-3" />
          {sent ? "Sent" : "Inbox"}
        </span>
      </div>

      <div className="flex gap-3">
        <MailAvatar who={m.from} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="font-semibold text-navy-900">{m.from.name || m.from.address}</p>
            {m.from.name ? <p className="min-w-0 break-all text-sm text-navy-400">&lt;{m.from.address}&gt;</p> : null}
            <time dateTime={m.at} className="ml-auto shrink-0 text-xs text-navy-400">
              {formatDateTime(m.at, timeZone)}
            </time>
          </div>
          <dl className="mt-0.5 space-y-0.5 text-sm text-navy-500">
            <div className="flex gap-1.5">
              <dt className="shrink-0">To</dt>
              <dd className="min-w-0 break-words text-navy-700">{m.to.map(formatAddress).join(", ")}</dd>
            </div>
            {m.cc.length ? (
              <div className="flex gap-1.5">
                <dt className="shrink-0">Cc</dt>
                <dd className="min-w-0 break-words text-navy-700">{m.cc.map(formatAddress).join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {m.status === "failed" ? (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <Icon name="close" className="h-4 w-4 shrink-0" />
          This email was not sent. Write it again from New email.
        </p>
      ) : null}

      {files.length ? (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-navy-400">
            <Icon name="paperclip" className="h-3.5 w-3.5" />
            {files.length} attachment{files.length === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" data-mail-attachments>
            {files.map((a) => {
              const kind = fileKind(a);
              const inner = (
                <>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold tracking-wide ${kind.tone}`}>
                    {kind.tag}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-900" title={a.name}>
                      {a.name}
                    </span>
                    <span className="block text-xs text-navy-400">{a.key ? formatFileSize(a.size) : a.dropped ?? "not kept"}</span>
                  </span>
                </>
              );
              return (
                <li key={a.id}>
                  {a.key ? (
                    <a
                      href={`${attachmentBase}?id=${encodeURIComponent(m.id)}&att=${encodeURIComponent(a.id)}`}
                      className="group flex items-center gap-3 rounded-xl border border-cream-300 bg-white p-2.5 transition hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-soft"
                    >
                      {inner}
                      <Icon name="download" className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:text-brand-600" title="Download" />
                    </a>
                  ) : (
                    <span className="flex items-center gap-3 rounded-xl border border-dashed border-cream-400 p-2.5 opacity-70">{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
