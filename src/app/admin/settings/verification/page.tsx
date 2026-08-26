import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getVerificationSettings } from "@/lib/verificationStore";
import { countries } from "@/config/countries";
import { AdminShell } from "@/components/admin/AdminShell";
import { CountryListEditor } from "@/components/admin/CountryListEditor";

export const metadata: Metadata = {
  title: "ID verification",
  robots: { index: false, follow: false },
};

export default async function AdminVerificationSettingsPage() {
  await requireAdmin();
  const settings = await getVerificationSettings();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">ID verification</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          Choose which countries have to prove their identity before their application goes
          further. Everyone else is unaffected.
        </p>
      </header>

      <CountryListEditor
        countries={countries}
        initial={settings.requiredCountries}
        isDefault={settings.isDefault}
        updatedAt={settings.updatedAt}
        endpoint="/api/admin/verification-settings"
        heading="Countries requiring ID verification"
        description="Candidates from these countries must upload an ID document and a photo of themselves holding it, straight after completing their assessment. They cannot skip it."
        chipsLabel="Verification required in"
        emptyText="No countries selected — identity verification is switched off for everyone."
      />

      <div className="card mt-5 p-5 text-sm leading-relaxed text-navy-600 sm:p-6">
        <h2 className="text-sm font-bold text-navy-900">How it works</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>The candidate finishes their assessment as normal — the result is saved first.</li>
          <li>
            If their country is listed, they are then asked for an ID document and a photo of
            themselves holding it. There is no skip button.
          </li>
          <li>
            The photos appear in their profile under Candidates, side by side, with Verify and
            Reject buttons.
          </li>
          <li>
            Identical photos uploaded by two candidates flag the second as a possible duplicate —
            the same person applying twice under a new email.
          </li>
          <li>
            You can delete the photographs once you have decided. The decision is kept; the images
            are not.
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
