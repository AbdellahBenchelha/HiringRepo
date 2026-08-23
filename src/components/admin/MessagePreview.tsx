"use client";

import { PLACEHOLDER_RE, renderTemplate, type TemplateVars } from "@/lib/messageTemplates";

/**
 * The message as the candidate will receive it, in a WhatsApp-shaped bubble.
 *
 * Any placeholder that survives rendering is one nothing will ever fill in, so
 * it is marked in red here rather than left to look like ordinary text. That
 * is the whole point of the preview: a typo in {{nmae}} is invisible in the
 * editor and arrives at the candidate as literal braces.
 */
export function MessagePreview({ body, vars }: { body: string; vars: TemplateVars }) {
  const rendered = renderTemplate(body, vars);

  // Split on whatever placeholders remain so they can be highlighted.
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of rendered.matchAll(PLACEHOLDER_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(rendered.slice(last, at));
    parts.push(
      <mark key={at} className="rounded bg-red-100 px-1 font-semibold text-red-700">
        {m[0]}
      </mark>,
    );
    last = at + m[0].length;
  }
  parts.push(rendered.slice(last));

  return (
    <div className="rounded-2xl bg-[#e5ddd5] p-4">
      <div className="max-w-full rounded-xl rounded-tr-sm bg-[#dcf8c6] px-3.5 py-2.5 shadow-sm">
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-navy-900">
          {parts.length ? parts : <span className="italic text-navy-400">Nothing to send yet.</span>}
        </p>
      </div>
    </div>
  );
}
