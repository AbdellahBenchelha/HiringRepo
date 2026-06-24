/**
 * Cookie-consent storage helpers.
 *
 * IMPORTANT: Non-essential cookies/tracking MUST NOT run until the visitor has
 * actively consented. Essential cookies are always allowed because the site
 * cannot function without them. Wire your analytics/marketing scripts to check
 * `getConsent()` (or listen for the "cookie-consent-changed" event) before
 * loading.
 */

export interface CookieConsent {
  essential: true; // always true — required for the site to work
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  /** ISO timestamp of when consent was recorded. */
  decidedAt: string;
}

const STORAGE_KEY = "nexacare.cookie-consent.v1";
export const CONSENT_EVENT = "cookie-consent-changed";
export const OPEN_PREFERENCES_EVENT = "open-cookie-preferences";

export function getConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookieConsent) : null;
  } catch {
    return null;
  }
}

export function saveConsent(consent: Omit<CookieConsent, "essential" | "decidedAt">): void {
  if (typeof window === "undefined") return;
  const full: CookieConsent = { essential: true, ...consent, decidedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: full }));
}
