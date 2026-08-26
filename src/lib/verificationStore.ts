/**
 * SERVER-ONLY persistence for which countries require identity verification.
 *
 * A small file of its own beside candidates.json, for the same reason the
 * message templates have one: changing a setting should never rewrite the file
 * holding every application, and a setting that breaks something is fixable by
 * deleting one small file.
 *
 * Nigeria is the built-in default — the country this was built for. Editing the
 * list in the Admin Panel replaces it entirely, including with an empty list,
 * which switches verification off without a deploy.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { countries } from "@/config/countries";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "verification.json");

export const DEFAULT_REQUIRED_COUNTRIES = ["Nigeria"] as const;

interface StoredFile {
  requiredCountries?: unknown;
  updatedAt?: unknown;
}

let writeChain: Promise<unknown> = Promise.resolve();

export interface VerificationSettings {
  requiredCountries: string[];
  updatedAt?: string;
  /** True while nothing has been saved and the built-in default is in use. */
  isDefault: boolean;
}

/**
 * Which countries require verification right now.
 *
 * Anything that is not a country we recognise is dropped rather than trusted:
 * the list decides who is forced through an extra step, and a typo would
 * silently exempt a whole country.
 */
export async function getVerificationSettings(): Promise<VerificationSettings> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const data = JSON.parse(raw) as StoredFile;
    if (Array.isArray(data.requiredCountries)) {
      const known = new Set(countries);
      const list = data.requiredCountries
        .filter((c): c is string => typeof c === "string" && known.has(c))
        .sort();
      return {
        requiredCountries: list,
        updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
        isDefault: false,
      };
    }
  } catch {
    /* fall through to the default */
  }
  return { requiredCountries: [...DEFAULT_REQUIRED_COUNTRIES], isDefault: true };
}

/** Just the list, for callers that only need to test membership. */
export async function requiredCountries(): Promise<string[]> {
  return (await getVerificationSettings()).requiredCountries;
}

export async function saveVerificationSettings(
  list: string[],
): Promise<{ ok: boolean; settings?: VerificationSettings; error?: string }> {
  const known = new Set(countries);
  const cleaned = [...new Set(list.filter((c) => known.has(c)))].sort();
  if (cleaned.length !== new Set(list).size) {
    return { ok: false, error: "unknown_country" };
  }

  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      FILE,
      JSON.stringify({ requiredCountries: cleaned, updatedAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    return { ok: true, settings: await getVerificationSettings() };
  };

  const p = writeChain.then(run, run);
  writeChain = p.catch(() => ({ ok: false, error: "write_failed" }));
  return p;
}
