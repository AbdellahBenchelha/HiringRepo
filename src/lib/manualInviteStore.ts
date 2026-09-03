/**
 * SERVER-ONLY persistence for countries whose assessment invitation is held
 * back rather than emailed the moment someone applies.
 *
 * The invitation normally goes out automatically on submit. For some countries
 * that is not wanted — a wave of applications from one place, or somewhere
 * worth a look before spending an assessment link on it. Adding a country here
 * does not reject anyone: it moves the send from automatic to a button in the
 * Admin Panel.
 *
 * Empty by default. Nothing changes for anyone until a country is added, and
 * every country added is a queue somebody now has to work through by hand — so
 * it has to be a decision taken, not something that arrives with a deploy.
 */
import { createCountrySetting } from "@/lib/countrySetting";
import { countryRuleApplies } from "@/lib/phoneCountry";

const store = createCountrySetting("manual-invite.json", "manualInviteCountries");

export interface ManualInviteSettings {
  manualInviteCountries: string[];
  updatedAt?: string;
  isDefault: boolean;
}

export async function getManualInviteSettings(): Promise<ManualInviteSettings> {
  const s = await store.get();
  return { manualInviteCountries: s.countries, updatedAt: s.updatedAt, isDefault: s.isDefault };
}

/** Just the list, for callers that only need to test membership. */
export function manualInviteCountries(): Promise<string[]> {
  return store.list();
}

export async function saveManualInviteSettings(
  list: string[],
): Promise<{ ok: boolean; settings?: ManualInviteSettings; error?: string }> {
  const result = await store.save(list);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, settings: await getManualInviteSettings() };
}

/**
 * Should this candidate's invitation wait for a person?
 *
 * Judged on the stated country and the dialling code together, like the
 * identity and CV rules — a rule keyed only on the dropdown is one click from
 * being useless.
 */
export function manualInviteApplies(
  c: { country?: string; phone?: string },
  list: readonly string[],
): boolean {
  return countryRuleApplies(c.country, c.phone, list);
}
