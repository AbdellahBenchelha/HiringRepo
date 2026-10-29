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
  return (
    <div>
      {remoteImages && !images ? (
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl border border-b-0 border-cream-300 bg-cream-100 px-4 py-2 text-sm text-navy-600" data-images-bar>
          <Icon name="shield" className="h-4 w-4 shrink-0 text-navy-500" />
          Pictures from the internet are hidden, to protect your privacy.
          <button type="button" onClick={() => setImages(true)} className="font-semibold text-brand-700 underline underline-offset-2">
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
        className={`h-[65vh] min-h-[360px] w-full border border-cream-300 bg-white ${remoteImages && !images ? "rounded-b-2xl" : "rounded-2xl"}`}
      />
    </div>
  );
}
