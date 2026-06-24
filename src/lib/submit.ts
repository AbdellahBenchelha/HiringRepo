/**
 * FORM SUBMISSION — BACKEND INTEGRATION POINTS
 * ============================================
 *
 * This module is the ONLY place the frontend talks to a backend. When
 * `siteConfig.demoMode` is true, NOTHING is transmitted: submissions are
 * simulated locally and clearly labelled as TEST submissions in the UI.
 *
 * To go live, set `siteConfig.demoMode = false` and implement the server-side
 * integration points described below. The recommended approach is a single
 * API route (e.g. /api/apply and /api/contact) that:
 *
 *   1. APPLICATION SUBMISSION
 *      - Receives multipart/form-data (fields + files).
 *      - Validates and sanitises every field server-side (never trust the client).
 *
 *   2. SECURE CV STORAGE
 *      - Streams uploaded files to private object storage (e.g. S3/GCS) with
 *        encryption at rest and signed, time-limited access URLs.
 *      - Never store CVs in a public bucket or commit them to the repo.
 *
 *   3. EMAIL NOTIFICATIONS
 *      - Sends the full application + document links to RECRUITMENT_EMAIL
 *        (server env var; mirror of siteConfig.contact.recruitmentEmail).
 *      - Sends an automatic confirmation email to the applicant.
 *      - Use a transactional email provider; keep API keys in server env vars.
 *
 *   4. DATABASE STORAGE
 *      - Persists the structured application for the recruitment team, with a
 *        retention period of siteConfig.legal.applicantDataRetentionMonths.
 *
 *   5. SPAM PROTECTION
 *      - Verify a CAPTCHA / token (e.g. reCAPTCHA, hCaptcha, Turnstile) and
 *        the honeypot field server-side. Rate-limit by IP.
 *
 *   6. APPLICANT-DATA DELETION
 *      - Provide an endpoint/process to delete an applicant's data on request
 *        and automatically after the retention period.
 *
 * SECURITY: Do NOT place private API keys in this file or anywhere in the
 * frontend bundle. All secrets belong in server-side environment variables.
 */

import { siteConfig } from "@/config/site";

export interface SubmitResult {
  ok: boolean;
  demo: boolean;
  message?: string;
}

/** Simulate network latency in demo mode so UX (spinners, disabling) is realistic. */
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitApplication(
  formData: FormData
): Promise<SubmitResult> {
  if (siteConfig.demoMode) {
    await wait(900);
    // Demonstration only — no data leaves the browser.
    // eslint-disable-next-line no-console
    console.info(
      "[DEMO MODE] Application captured locally and NOT transmitted.",
      Object.fromEntries(
        Array.from(formData.entries()).map(([k, v]) => [
          k,
          v instanceof File ? `File(${v.name})` : v,
        ])
      )
    );
    return { ok: true, demo: true };
  }

  // PRODUCTION INTEGRATION POINT — implement /api/apply (see file header).
  const res = await fetch("/api/apply", { method: "POST", body: formData });
  if (!res.ok) {
    return { ok: false, demo: false, message: "Submission failed. Please try again." };
  }
  return { ok: true, demo: false };
}

export async function submitContact(formData: FormData): Promise<SubmitResult> {
  if (siteConfig.demoMode) {
    await wait(700);
    // eslint-disable-next-line no-console
    console.info(
      "[DEMO MODE] Contact message captured locally and NOT transmitted.",
      Object.fromEntries(formData.entries())
    );
    return { ok: true, demo: true };
  }

  // PRODUCTION INTEGRATION POINT — implement /api/contact.
  const res = await fetch("/api/contact", { method: "POST", body: formData });
  if (!res.ok) {
    return { ok: false, demo: false, message: "Could not send your message. Please try again." };
  }
  return { ok: true, demo: false };
}
