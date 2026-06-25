import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Equal Opportunity Statement",
  description:
    "WorkRoute is committed to fair recruitment and considering qualified applicants without unlawful discrimination.",
  path: "/equal-opportunity",
});

export default function EqualOpportunityPage() {
  const { company, contact } = siteConfig;
  return (
    <LegalPageLayout
      title="Equal Opportunity Statement"
      lastUpdated="Review before publishing"
      intro={`${company.name} is committed to fair and inclusive recruitment.`}
    >
      <h2>Our commitment</h2>
      <p>
        We are committed to providing equal opportunities in recruitment and employment. We consider
        all qualified applicants based on merit — their skills, experience, and suitability for the
        role — and we do not tolerate unlawful discrimination.
      </p>

      <h2>An inclusive process</h2>
      <p>
        We strive to make our recruitment process welcoming and accessible to people of all
        backgrounds. We value diversity and believe that diverse teams deliver better experiences
        for the customers we support.
      </p>

      <h2>Reasonable accommodations</h2>
      <p>
        If you need an adjustment or accommodation at any stage of the application or interview
        process, please contact us at{" "}
        <a href={`mailto:${contact.recruitmentEmail}`}>{contact.recruitmentEmail}</a> and we will do
        our best to support you. See also our <a href="/accessibility">Accessibility Statement</a>.
      </p>

      <p className="mt-6 text-sm text-navy-500">
        Note: This statement reflects our commitment to fairness. It does not assert compliance with
        any specific law unless the company&apos;s jurisdiction and legal obligations have been
        confirmed and this statement reviewed accordingly.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
