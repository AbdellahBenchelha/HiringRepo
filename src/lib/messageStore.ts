/**
 * SERVER-ONLY persistence for the two WhatsApp follow-up templates.
 *
 * Kept in its own file beside candidates.json rather than inside it. Two
 * reasons: editing a template never rewrites the candidate records (every
 * write here rewrites the whole file, and that file holds every application),
 * and if a template is ever saved in a state that breaks a send, deleting one
 * small file restores the built-in wording.
 *
 * Set DATA_DIR to relocate both files onto a persistent disk.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  LENGTH_MAX,
  unknownPlaceholders,
  type MessageTemplates,
  type TemplateKey,
} from "@/lib/messageTemplates";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "messages.json");

type StoredFile = Partial<Record<TemplateKey, { body?: unknown; updatedAt?: unknown }>>;

async function readFile(): Promise<StoredFile> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? (data as StoredFile) : {};
  } catch {
    return {};
  }
}

// Serialize writes, matching the candidate store. Two templates saved at once
// is unlikely but the cost of getting it wrong is a truncated file.
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Current wording for both messages.
 *
 * A missing file, a corrupt file or a blank body all fall back to the built-in
 * default. An empty body would open WhatsApp with an empty box, which reads as
 * a broken button rather than as a configuration mistake.
 */
export async function getMessageTemplates(): Promise<MessageTemplates> {
  const saved = await readFile();
  const out = {} as MessageTemplates;
  for (const key of TEMPLATE_KEYS) {
    const body = typeof saved[key]?.body === "string" ? (saved[key]!.body as string) : "";
    const updatedAt = typeof saved[key]?.updatedAt === "string" ? (saved[key]!.updatedAt as string) : undefined;
    out[key] = body.trim()
      ? { body, updatedAt, isDefault: false }
      : { body: DEFAULT_TEMPLATES[key], isDefault: true };
  }
  return out;
}

export type SaveResult =
  | { ok: true; templates: MessageTemplates }
  | { ok: false; error: "empty" | "too_long" | "unknown_placeholder"; detail?: string[] };

/**
 * Save one template, or restore its default.
 *
 * Passing null for the body removes the saved copy so the built-in wording
 * takes over again — that is what "Reset to default" does, rather than writing
 * a copy of the default text that would then drift.
 *
 * The same validation runs here as in the editor. The editor's checks are a
 * convenience; these are the ones that decide.
 */
export async function saveMessageTemplate(key: TemplateKey, body: string | null): Promise<SaveResult> {
  if (body !== null) {
    if (!body.trim()) return { ok: false, error: "empty" };
    if (body.length > LENGTH_MAX) return { ok: false, error: "too_long" };
    const unknown = unknownPlaceholders(body);
    if (unknown.length) return { ok: false, error: "unknown_placeholder", detail: unknown };
  }

  const run = async (): Promise<SaveResult> => {
    const current = await readFile();
    const next: StoredFile = { ...current };
    if (body === null) delete next[key];
    else next[key] = { body, updatedAt: new Date().toISOString() };

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
    return { ok: true, templates: await getMessageTemplates() };
  };

  const p = writeChain.then(run, run);
  writeChain = p.catch(() => {});
  return p;
}
