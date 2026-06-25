import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Legal Notice",
  description: "Legal and company identification details for WorkRoute.",
  path: "/legal-notice",
});

export default function LegalNoticePage() {
  const { legal, contact } = siteConfig;
  const rows: { label: string; value: string }[] = [
    { label: "Registered company name", value: legal.registeredName },
    { label: "Legal business type", value: legal.businessType },
    { label: "Registration number", value: legal.registrationNumber },
    { label: "Tax number", value: legal.taxNumber },
    { label: "Registered address", value: legal.registeredAddress },
    { label: "Email", value: contact.recruitmentEmail },
    { label: "Phone number", value: contact.phone },
    { label: "Website owner", value: legal.websiteOwner },
    { label: "Hosting provider", value: legal.hostingProvider },
  ];

  return (
    <LegalPageLayout
      title="Legal Notice"
      lastUpdated="Review before publishing"
      intro="Company identification and legal information for this website."
    >
      <p>
        The details below identify the operator of this website. All values are configurable and
        must be completed with verified company information before publishing.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-navy-100">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-navy-100">
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="w-1/3 bg-navy-50/60 px-4 py-3 font-medium text-navy-700">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-navy-800">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
