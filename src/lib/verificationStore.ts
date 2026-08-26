/**
 * SERVER-ONLY persistence for which countries require identity verification.
 *
 * Nigeria is the built-in default — the country this was built for. Editing the
 * list in the Admin Panel replaces it entirely, including with an empty list,
 * which switches verification off without a deploy.
 *
 * The storage itself is shared with the other country-scoped rules; see
 * src/lib/countrySetting.ts.
 */
import { createCountrySetting } from "@/lib/countrySetting";

export const DEFAULT_REQUIRED_COUNTRIES = ["Nigeria"] as const;

const store = createCountrySetting(
  "verification.json",
  "requiredCountries",
  DEFAULT_REQUIRED_COUNTRIES,
);

export interface VerificationSettings {
  requiredCountries: string[];
  updatedAt?: string;
  isDefault: boolean;
}

/** Which countries require verification right now. */
export async function getVerificationSettings(): Promise<VerificationSettings> {
  const s = await store.get();
  return { requiredCountries: s.countries, updatedAt: s.updatedAt, isDefault: s.isDefault };
}

/** Just the list, for callers that only need to test membership. */
export function requiredCountries(): Promise<string[]> {
  return store.list();
}

export async function saveVerificationSettings(
  list: string[],
): Promise<{ ok: boolean; settings?: VerificationSettings; error?: string }> {
  const result = await store.save(list);
  if (!result.ok || !result.settings) return { ok: false, error: result.error };
  return { ok: true, settings: await getVerificationSettings() };
}
