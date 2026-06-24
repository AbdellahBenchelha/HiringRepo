"use client";

import { OPEN_PREFERENCES_EVENT } from "./cookieConsent";

export function CookiePreferencesLink({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT))}
    >
      Cookie Preferences
    </button>
  );
}
