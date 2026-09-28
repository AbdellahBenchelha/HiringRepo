import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getChatSettings } from "@/lib/chatStore";
import { ChatSettingsEditor } from "@/components/admin/chat/ChatSettingsEditor";

export const metadata: Metadata = { title: "Live chat settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminChatSettingsPage() {
  await requireAdmin();
  const settings = await getChatSettings();
  return (
    <>
      <header className="mb-5">
        <h2 className="text-lg font-bold text-navy-900">Live chat</h2>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          The questions you keep to hand in the final interview chat, and the hours candidates are
          told you reply.
        </p>
      </header>
      <ChatSettingsEditor initial={settings} />
    </>
  );
}
