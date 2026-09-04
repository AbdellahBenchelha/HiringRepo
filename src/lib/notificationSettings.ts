/**
 * SERVER-ONLY: how noisy Telegram should be.
 *
 * One flag today. Kept in its own small file beside candidates.json for the
 * same reason the other settings are: changing it should never rewrite the
 * file holding every application.
 *
 * Off by default. A setting that silences notifications is not something that
 * should arrive with a deploy — nobody would know why the messages stopped.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";

const FILE = "notifications.json";

export interface NotificationSettings {
  /**
   * For applicants who owe an identity check, say nothing until they finish
   * the assessment — no "new application", no "form submitted". The
   * completion message is always sent, whoever they are.
   */
  quietUntilAssessment: boolean;
  updatedAt?: string;
  /** True while nothing has been saved and the built-in default is in use. */
  isDefault: boolean;
}

const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
const file = () => path.join(dir(), FILE);

let writeChain: Promise<unknown> = Promise.resolve();

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await fs.readFile(file(), "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (typeof data.quietUntilAssessment === "boolean") {
      return {
        quietUntilAssessment: data.quietUntilAssessment,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        isDefault: false,
      };
    }
  } catch {
    /* fall through to the default */
  }
  return { quietUntilAssessment: false, isDefault: true };
}

export async function saveNotificationSettings(
  quietUntilAssessment: boolean,
): Promise<{ ok: boolean; settings?: NotificationSettings; error?: string }> {
  const run = async () => {
    await writeFileAtomic(
      file(),
      JSON.stringify({ quietUntilAssessment, updatedAt: new Date().toISOString() }, null, 2),
    );
    return { ok: true, settings: await getNotificationSettings() };
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => ({ ok: false, error: "write_failed" }));
  return p;
}
