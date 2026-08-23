/**
 * The two WhatsApp follow-up messages sent from the Interviews table.
 *
 * Pure module — no filesystem, no node built-ins — so the editor, the preview
 * and the send dialog can all share one definition of what a placeholder is
 * and how it renders. Reading and writing the saved copies lives in
 * messageStore.ts, which is server-only.
 *
 * The defaults below are the exact wording that used to be hardcoded in
 * InterviewActions.tsx, with the candidate's name turned into a placeholder.
 * They stay in the code so "Reset to default" always has something to restore
 * and a missing or corrupt messages.json can never produce an empty send.
 */
import { siteConfig } from "@/config/site";

export const TEMPLATE_KEYS = ["interviewSuccess", "voiceAssessment"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export interface TemplateMeta {
  key: TemplateKey;
  label: string;
  description: string;
}

export const TEMPLATE_META: Record<TemplateKey, TemplateMeta> = {
  interviewSuccess: {
    key: "interviewSuccess",
    label: "Interview success",
    description: "Sent by the green Success Message button once a candidate has passed the online interview.",
  },
  voiceAssessment: {
    key: "voiceAssessment",
    label: "Voice assessment request",
    description: "Sent by the Voice Assessment button. Contains the script the candidate reads aloud and records.",
  },
};

export interface PlaceholderMeta {
  /** Token name, without braces. */
  name: string;
  label: string;
  /** What it looks like once filled in, for the chip tooltip. */
  example: string;
}

export const PLACEHOLDERS: PlaceholderMeta[] = [
  { name: "full_name", label: "Full name", example: "Mohammed Al-Rashid" },
  { name: "first_name", label: "First name", example: "Mohammed" },
  { name: "position", label: "Position", example: "Customer Support Representative" },
  { name: "country", label: "Country", example: "United Arab Emirates" },
  { name: "company", label: "Company", example: siteConfig.company.name },
];

const KNOWN = new Set(PLACEHOLDERS.map((p) => p.name));

/** Matches {{ token }}, tolerating spaces inside the braces. */
export const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export interface TemplateVars {
  full_name: string;
  first_name: string;
  position: string;
  country: string;
  company: string;
}

/**
 * Build the substitution values for one candidate.
 *
 * The name falls back to "there" — the same fallback the hardcoded messages
 * used — so a record with no name still greets the candidate instead of
 * opening with a blank.
 */
export function buildVars(c: {
  fullName?: string;
  firstName?: string;
  position?: string;
  country?: string;
}): TemplateVars {
  const full = (c.fullName || "").trim();
  const first = (c.firstName || "").trim() || full.split(/\s+/)[0] || "";
  return {
    full_name: full || "there",
    first_name: first || "there",
    position: (c.position || "").trim() || "the role",
    country: (c.country || "").trim(),
    company: siteConfig.company.name,
  };
}

/** Replace every known placeholder. Unknown ones are left visible on purpose. */
export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(PLACEHOLDER_RE, (match, name: string) =>
    KNOWN.has(name) ? String(vars[name as keyof TemplateVars] ?? "") : match,
  );
}

/**
 * Placeholder names in the body that nothing will ever fill in.
 *
 * A typo like {{nmae}} is invisible while writing and arrives at the candidate
 * as literal braces, so saving is blocked on it rather than warned about.
 */
export function unknownPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(PLACEHOLDER_RE)) {
    if (!KNOWN.has(m[1])) found.add(m[1]);
  }
  return [...found];
}

/**
 * Length at which a wa.me link starts being a gamble.
 *
 * The message travels inside the URL, so it is spent twice over once encoded —
 * a newline costs three characters, an accent four. Both defaults sit far
 * under this; the counter turns amber at SOFT and red at HARD.
 */
export const LENGTH_SOFT_LIMIT = 1500;
export const LENGTH_HARD_LIMIT = 2000;
/** Refused outright — past here the link itself becomes unreliable. */
export const LENGTH_MAX = 4000;

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  interviewSuccess:
    `Hello {{full_name}},\n\n` +
    `Congratulations! You have successfully completed the online interview, and you performed very well.\n\n` +
    `Thank you for taking the time to answer all the interview questions. We are pleased to inform you that you have passed this stage of our recruitment process.\n\n` +
    `The next step will be a short voice assessment. We will send you the instructions shortly.\n\n` +
    `Best regards,\nRecruitment Team`,

  voiceAssessment:
    `Hello {{full_name}},\n\n` +
    `You have now reached the voice-assessment stage of our recruitment process.\n\n` +
    `To help us evaluate your pronunciation, communication skills, fluency, and voice clarity, please record a voice message while reading the text below.\n\n` +
    `Please read slowly, clearly, and naturally:\n\n` +
    `"Hello, my name is {{full_name}}. I am interested in joining your customer-support team. I enjoy communicating with customers, listening carefully to their concerns, and helping them find the best possible solution. I understand that professional customer service requires patience, respect, clear communication, and a positive attitude. I am comfortable working as part of a team, following company procedures, and learning new skills. I am motivated to provide customers with a helpful and professional experience."\n\n` +
    `After reading the complete text, please send the audio recording directly to us through WhatsApp.\n\n` +
    `Please record the message in a quiet environment and make sure your voice is clear.\n\n` +
    `Best regards,\nRecruitment Team`,
};

export interface StoredTemplate {
  body: string;
  updatedAt?: string;
  /** True while the built-in wording is in use — nothing has been saved yet. */
  isDefault: boolean;
}

export type MessageTemplates = Record<TemplateKey, StoredTemplate>;
