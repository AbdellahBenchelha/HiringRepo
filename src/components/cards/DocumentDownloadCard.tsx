import { Icon } from "@/components/Icon";

export interface DocumentMetaItem {
  label: string;
  value: string;
}

/**
 * Download card for a static document in /public.
 *
 * The metadata row (format, pages, size, version) is deliberately visible:
 * candidates on limited mobile data should know what they are about to open.
 */
export function DocumentDownloadCard({
  title,
  description,
  href,
  downloadName,
  meta,
  note,
}: {
  title: string;
  description: string;
  href: string;
  downloadName: string;
  meta: DocumentMetaItem[];
  note?: string;
}) {
  return (
    <div className="card">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700"
        >
          <Icon name="document" className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">{description}</p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {meta.map((item) => (
              <div key={item.label} className="flex items-baseline gap-1.5">
                <dt className="text-navy-500">{item.label}:</dt>
                <dd className="font-medium text-navy-800">{item.value}</dd>
              </div>
            ))}
          </dl>

          <a
            href={href}
            download={downloadName}
            className="btn-primary mt-6"
            // The file is unlisted; keep it out of search engines and referrers.
            rel="nofollow noreferrer"
          >
            <Icon name="download" className="h-5 w-5" aria-hidden="true" />
            Download the sample contract (PDF)
          </a>

          {note ? <p className="mt-3 text-xs leading-relaxed text-navy-500">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}
