/**
 * SERVER-ONLY persistence for which countries must attach a CV.
 *
 * Empty by default, so nothing changes for anyone until a country is added in
 * the Admin Panel. That matters more here than for identity verification: a CV
 * is optional everywhere else on the site, and making it mandatory turns some
 * applicants away, so it has to be a decision somebody took rather than
 * something that arrived with a deploy.
 */
import { createCountrySetting } from "@/lib/countrySetting";

const store = createCountrySetting("cv-requirement.json", "cvRequiredCountries");

export interface CvSettings {
  cvRequiredCountries: string[];
  updatedAt?: string;
  isDefault: boolean;
}

export async function getCvSettings(): Promise<CvSettings> {
  const s = await store.get();
  return { cvRequiredCountries: s.countries, updatedAt: s.updatedAt, isDefault: s.isDefault };
}

/** Just the list, for callers that only need to test membership. */
export function cvRequiredCountries(): Promise<string[]> {
  return store.list();
}

export async function saveCvSettings(
  list: string[],
): Promise<{ ok: boolean; settings?: CvSettings; error?: string }> {
  const result = await store.save(list);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, settings: await getCvSettings() };
}

/** Does this candidate have to attach a CV? */
export function cvRequiredFor(country: string | undefined, required: readonly string[]): boolean {
  return !!country && required.includes(country);
}
