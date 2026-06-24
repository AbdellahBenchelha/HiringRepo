"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  CONSENT_EVENT,
  OPEN_PREFERENCES_EVENT,
  getConsent,
  saveConsent,
} from "./cookieConsent";

type Toggles = { analytics: boolean; preferences: boolean; marketing: boolean };

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [toggles, setToggles] = useState<Toggles>({
    analytics: false,
    preferences: false,
    marketing: false,
  });

  useEffect(() => {
    const existing = getConsent();
    if (existing) {
      setToggles({
        analytics: existing.analytics,
        preferences: existing.preferences,
        marketing: existing.marketing,
      });
    } else {
      setShowBanner(true);
    }
    const openPrefs = () => {
      const current = getConsent();
      if (current) {
        setToggles({
          analytics: current.analytics,
          preferences: current.preferences,
          marketing: current.marketing,
        });
      }
      setShowPreferences(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
  }, []);

  function persist(values: Toggles) {
    saveConsent(values);
    setToggles(values);
    setShowBanner(false);
    setShowPreferences(false);
  }

  const acceptAll = () => persist({ analytics: true, preferences: true, marketing: true });
  const rejectNonEssential = () =>
    persist({ analytics: false, preferences: false, marketing: false });
  const savePreferences = () => persist(toggles);

  if (!showBanner && !showPreferences) return null;

  return (
    <>
      {/* Consent banner */}
      {showBanner && !showPreferences ? (
        <div
          role="dialog"
          aria-label="Cookie consent"
          aria-describedby="cookie-consent-desc"
          className="fixed inset-x-0 bottom-0 z-[70] border-t border-navy-200 bg-white p-4 shadow-card sm:p-6"
        >
          <div className="container-page flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <p id="cookie-consent-desc" className="max-w-2xl text-sm text-navy-600">
              We use essential cookies to make our site work. With your consent, we may also use
              analytics, preference, and marketing cookies to improve your experience. Read our{" "}
              <Link href="/cookie-policy" className="font-medium text-brand-700 underline">
                Cookie Policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowPreferences(true)} className="btn-secondary">
                Customize
              </button>
              <button type="button" onClick={rejectNonEssential} className="btn-secondary">
                Reject non-essential
              </button>
              <button type="button" onClick={acceptAll} className="btn-primary">
                Accept all
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Preferences dialog */}
      {showPreferences ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowPreferences(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-card sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 id="cookie-prefs-title" className="text-lg font-semibold">
                Cookie Preferences
              </h2>
              <button
                type="button"
                onClick={() => setShowPreferences(false)}
                className="rounded-full p-2 text-navy-500 hover:bg-navy-50"
                aria-label="Close cookie preferences"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <PreferenceRow
                title="Essential cookies"
                description="Required for the website to function. These are always active."
                checked
                disabled
              />
              <PreferenceRow
                title="Analytics cookies"
                description="Help us understand how visitors use the site so we can improve it."
                checked={toggles.analytics}
                onChange={(v) => setToggles((t) => ({ ...t, analytics: v }))}
              />
              <PreferenceRow
                title="Preference cookies"
                description="Remember your choices, such as language and layout preferences."
                checked={toggles.preferences}
                onChange={(v) => setToggles((t) => ({ ...t, preferences: v }))}
              />
              <PreferenceRow
                title="Marketing cookies"
                description="Used to deliver relevant recruitment messages, if enabled."
                checked={toggles.marketing}
                onChange={(v) => setToggles((t) => ({ ...t, marketing: v }))}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={rejectNonEssential} className="btn-secondary">
                Reject non-essential
              </button>
              <button type="button" onClick={savePreferences} className="btn-primary">
                Save preferences
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PreferenceRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-navy-100 p-4">
      <div>
        <p className="text-sm font-semibold text-navy-900">{title}</p>
        <p className="mt-1 text-xs text-navy-500">{description}</p>
      </div>
      <label className="relative inline-flex shrink-0 cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-navy-200 transition peer-checked:bg-brand-600 peer-disabled:opacity-60 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        <span className="sr-only">{title}</span>
      </label>
    </div>
  );
}

// Listen for cross-component consent changes (placeholder hook point for
// loading analytics scripts once consent is granted).
if (typeof window !== "undefined") {
  window.addEventListener(CONSENT_EVENT, () => {
    // INTEGRATION POINT: start/stop analytics & marketing scripts based on consent.
  });
}
