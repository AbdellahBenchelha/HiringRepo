/**
 * SERVER-ONLY persistence for "which countries does this rule apply to".
 *
 * There are two such rules — identity verification, and whether a CV is
 * required — and there will probably be more. They are the same shape, so they
 * share one implementation rather than two copies that drift apart.
 *
 * Each rule keeps its own small file beside candidates.json, for the same
 * reason the message templates do: changing a setting should never rewrite the
 * file holding every application, and a setting that breaks something is
 * fixable by deleting one small file.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { writeFileAtomic } from "@/lib/atomicWrite";
import { countries } from "@/config/countries";

export interface CountrySettings {
  countries: string[];
  updatedAt?: string;
  /** True while nothing has been saved and the built-in default is in use. */
  isDefault: boolean;
}

export interface CountrySettingStore {
  get(): Promise<CountrySettings>;
  /** Just the list, for callers that only need to test membership. */
  list(): Promise<string[]>;
  save(list: string[]): Promise<{ ok: boolean; settings?: CountrySettings; error?: string }>;
}

/**
 * @param filename  the file under DATA_DIR, e.g. "verification.json"
 * @param key       the property inside it holding the list
 * @param defaults  used until something is saved; an empty list is a valid
 *                  saved value and is not the same as never having saved
 */
export function createCountrySetting(
  filename: string,
  key: string,
  defaults: readonly string[] = [],
): CountrySettingStore {
  const dir = () => process.env.DATA_DIR || path.join(process.cwd(), "data");
  const file = () => path.join(dir(), filename);

  // Writes to one file are serialised against each other, so two admins saving
  // at the same moment cannot interleave and truncate the file.
  let writeChain: Promise<unknown> = Promise.resolve();

  async function get(): Promise<CountrySettings> {
    try {
      const raw = await fs.readFile(file(), "utf8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      const stored = data[key];
      if (Array.isArray(stored)) {
        // Anything we do not recognise is dropped rather than trusted: the
        // list decides who is forced through an extra step, and a typo would
        // silently exempt a whole country.
        const known = new Set(countries);
        const list = stored
          .filter((c): c is string => typeof c === "string" && known.has(c))
          .sort();
        return {
          countries: list,
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
          isDefault: false,
        };
      }
    } catch {
      /* fall through to the default */
    }
    return { countries: [...defaults], isDefault: true };
  }

  async function save(list: string[]) {
    const known = new Set(countries);
    const cleaned = [...new Set(list.filter((c) => known.has(c)))].sort();
    if (cleaned.length !== new Set(list).size) {
      return { ok: false, error: "unknown_country" };
    }

    const run = async () => {
      await writeFileAtomic(
        file(),
        JSON.stringify({ [key]: cleaned, updatedAt: new Date().toISOString() }, null, 2),
      );
      return { ok: true, settings: await get() };
    };

    const p = writeChain.then(run, run);
    writeChain = p.catch(() => ({ ok: false, error: "write_failed" }));
    return p;
  }

  return {
    get,
    list: async () => (await get()).countries,
    save,
  };
}
