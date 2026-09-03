import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getManualInviteSettings } from "@/lib/manualInviteStore";
import { countries } from "@/config/countries";
import { AdminShell } from "@/components/admin/AdminShell";
import { CountryListEditor } from "@/components/admin/CountryListEditor";

export const metadata: Metadata = {
  title: "Manual invitations",
  robots: { index: false, follow: false },
};

export default async function AdminManualInvitePage() {
  await requireAdmin();
  const settings = await getManualInviteSettings();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">Manual invitations</h1>
        <p className="mt-1 max-w-3xl text-sm text-navy-500">
          Choose which countries do not get their assessment link automatically. Applications still
          arrive as normal — you decide when to send the link.
        </p>
      </header>

      <CountryListEditor
        countries={countries}
        initial={settings.manualInviteCountries}
        isDefault={settings.isDefault}
        updatedAt={settings.updatedAt}
        endpoint="/api/admin/manual-invite-settings"
        heading="Countries invited by hand"
        description="Applicants from these countries have their assessment invitation held. Nothing is emailed until you press Send assessment link on their row under Candidates. Everyone else is invited automatically, as before."
        chipsLabel="Invited by hand"
        emptyText="No countries selected — everyone is invited automatically, as they are by default."
      />

      <div className="card mt-5 p-5 text-sm leading-relaxed text-navy-600 sm:p-6">
        <h2 className="text-sm font-bold text-navy-900">How it works</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>
            The application itself is unaffected. It is saved in full, you are notified as usual,
            and the candidate sees a normal confirmation — only the assessment email waits.
          </li>
          <li>
            Their row under <Link href="/admin/candidates" className="text-brand-700 underline">Candidates</Link>{" "}
            carries an <strong className="text-navy-800">Invitation held</strong> marker and a{" "}
            <strong className="text-navy-800">Send assessment link</strong> button. One click sends
            the same email that would have gone automatically.
          </li>
          <li>
            The rule reads the dialling code as well as the country they picked, so choosing a
            country that is not listed while using a number from one that is does not slip through.
          </li>
          <li>
            The candidate is told their application is under review rather than to watch their
            inbox — nobody is left waiting for an email that is not coming.
          </li>
          <li>
            Removing a country stops the holding, but does not send anything that was already held.
            Those still need the button.
          </li>
          <li>
            Every country here is a queue you have to work through by hand. A held invitation that
            nobody sends is a candidate who quietly goes elsewhere.
          </li>
        </ul>
      </div>
    </AdminShell>
  );
}
