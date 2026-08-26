import type { Metadata } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { getCvSettings } from "@/lib/cvStore";
import { countries } from "@/config/countries";
import { AdminShell } from "@/components/admin/AdminShell";
import { CountryListEditor } from "@/components/admin/CountryListEditor";

export const metadata: Metadata = {
  title: "CV requirement",
  robots: { index: false, follow: false },
};

export default async function AdminCvSettingsPage() {
  await requireAdmin();
  const settings = await getCvSettings();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">CV requirement</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          Choose which countries must attach a CV to apply. Everywhere else a CV stays optional.
        </p>
      </header>

      <CountryListEditor
        countries={countries}
        initial={settings.cvRequiredCountries}
        isDefault={settings.isDefault}
        updatedAt={settings.updatedAt}
        endpoint="/api/admin/cv-settings"
        heading="Countries that must attach a CV"
        description="Applicants who pick one of these countries cannot submit the form without a CV. Cover letters and certificates stay optional for everyone."
        chipsLabel="CV required in"
        emptyText="No countries selected — a CV is optional for everyone, as it is by default."
      />

      <div className="card mt-5 p-5 text-sm leading-relaxed text-navy-600 sm:p-6">
        <h2 className="text-sm font-bold text-navy-900">How it works</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            The applicant picks their country on the first step, so by the documents step the form
            already knows whether to insist.
          </li>
          <li>
            If their country is listed, the CV field is marked required and the form will not
            submit without one. Everyone else sees it as optional, unchanged.
          </li>
          <li>
            Someone who changes their country later is re-checked before submitting, so switching
            to a listed country after skipping the CV does not slip through.
          </li>
          <li>
            The CV appears in their profile under Candidates like any other document, and can be
            read in the panel without downloading it.
          </li>
          <li>
            This is a bar on applying. Every country you add here is a group of people who will
            give up rather than find a CV, so add them deliberately.
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
