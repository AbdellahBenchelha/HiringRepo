/**
 * FORM SUBMISSION
 * ===============
 *
 * The application form notifies the recruitment team directly through the
 * Telegram endpoint (/api/telegram) — see ApplicationForm + src/lib/notify.ts.
 *
 * The contact form posts here to /api/contact, which forwards the message to
 * the team's Telegram chat (see src/lib/telegram.ts).
 *
 * SECURITY: Do NOT place private API keys in this file or anywhere in the
 * frontend bundle. All secrets belong in server-side environment variables.
 */

export interface SubmitResult {
  ok: boolean;
  message?: string;
}

export async function submitContact(formData: FormData): Promise<SubmitResult> {
  const res = await fetch("/api/contact", { method: "POST", body: formData });
  if (!res.ok) {
    return { ok: false, message: "Could not send your message. Please try again." };
  }
  return { ok: true };
}
