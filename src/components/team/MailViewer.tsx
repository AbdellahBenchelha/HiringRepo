"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * The reading pane: the email in its own sandboxed page (see
 * lib/teamMailHtml). Pictures from the internet stay hidden until "Show
 * images", because loading them tells the sender the email was opened.
 */
export function MailViewer({ base, id, remoteImages }: { base: string; id: string; remoteImages: boolean }) {
  const [images, setImages] = useState(false);
  const bar = remoteImages && !images;
  return (
    <div className="overflow-hidden rounded-2xl border border-cream-300 bg-white">
      {bar ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-navy-700" data-images-bar>
          <Icon name="shieldCheck" className="h-4 w-4 shrink-0 text-brand-700" />
          <span className="flex-1">Pictures from the internet are hidden, to protect your privacy.</span>
          <button
            type="button"
            onClick={() => setImages(true)}
            className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-100"
          >
            Show images
          </button>
        </div>
      ) : null}
      <iframe
        key={images ? "with-images" : "plain"}
        title="Email"
        src={`${base}?id=${encodeURIComponent(id)}${images ? "&images=1" : ""}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        data-mail-frame
        className="block h-[50vh] min-h-[320px] w-full bg-white sm:h-[60vh] sm:min-h-[360px]"
      />
    </div>
  );
}
