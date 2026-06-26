/**
 * FORM SUBMISSION
 * ===============
 *
 * This module is the ONLY place the frontend talks to a backend. The
 * application form posts to /api/apply and the contact form to /api/contact.
 * Both routes forward a notification to the team's Telegram chat (see
 * src/lib/telegram.ts) and acknowledge the request.
 *
 * SECURITY: Do NOT place private API keys in this file or anywhere in the
 * frontend bundle. All secrets belong in server-side environment variables.
 */

export interface SubmitResult {
  ok: boolean;
  message?: string;
}

export async function submitApplication(formData: FormData): Promise<SubmitResult> {
  const res = await fetch("/api/apply", { method: "POST", body: formData });
  if (!res.ok) {
    return { ok: false, message: "Submission failed. Please try again." };
  }
  return { ok: true };
}

export async function submitContact(formData: FormData): Promise<SubmitResult> {
  const res = await fetch("/api/contact", { method: "POST", body: formData });
  if (!res.ok) {
    return { ok: false, message: "Could not send your message. Please try again." };
  }
  return { ok: true };
}
