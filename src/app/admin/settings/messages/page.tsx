import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { listCandidates } from "@/lib/store";
import { getMessageTemplates } from "@/lib/messageStore";
import { buildVars } from "@/lib/messageTemplates";
import { AdminShell } from "@/components/admin/AdminShell";
import { MessageTemplatesEditor, type PreviewSample } from "@/components/admin/MessageTemplatesEditor";

export const metadata: Metadata = { title: "WhatsApp messages", robots: { index: false, follow: false } };

/** An invented candidate, so the preview works on a brand-new install. */
const EXAMPLE: PreviewSample = {
  id: "__example",
  label: "Example candidate",
  vars: buildVars({
    fullName: "Mohammed Al-Rashid",
    firstName: "Mohammed",
    position: "Customer Support Representative",
    country: "United Arab Emirates",
  }),
};

export default async function AdminMessagesPage() {
  await requireAdmin();

  const [templates, candidates] = await Promise.all([getMessageTemplates(), listCandidates()]);

  // Preview against people who actually reached the interview stage — those
  // are the only ones these two messages are ever sent to.
  const samples: PreviewSample[] = candidates
    .filter((c) => c.interview && c.fullName)
    .slice(0, 25)
    .map((c) => ({
      id: c.id,
      label: `${c.fullName}${c.position ? ` — ${c.position}` : ""}`,
      vars: buildVars(c),
    }));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">WhatsApp messages</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          The wording behind the two follow-up buttons in the Interviews table. Changes apply to everyone
          you message from now on — you can still adjust a single message when you send it.
        </p>
      </header>

      <MessageTemplatesEditor initial={templates} samples={[...samples, EXAMPLE]} />
    </AdminShell>
  );
}
