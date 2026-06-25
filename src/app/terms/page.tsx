import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "The terms and conditions governing the use of the WorkRoute recruitment website.",
  path: "/terms",
});

export default function TermsPage() {
  const { company, contact } = siteConfig;
  return (
    <LegalPageLayout
      title="Terms and Conditions"
      lastUpdated="Review before publishing"
      intro={`These terms govern your use of the ${company.name} website. By using the site, you agree to them.`}
    >
      <h2>1. Website use</h2>
      <p>
        You may use this website for lawful purposes related to learning about and applying for
        opportunities with us. You agree not to misuse the site or interfere with its operation.
      </p>

      <h2>2. Accuracy of information</h2>
      <p>
        You agree that any information you submit, including in applications, is accurate, current,
        and complete to the best of your knowledge. Providing false information may result in
        disqualification from the recruitment process.
      </p>

      <h2>3. Job advertisements</h2>
      <p>
        Job listings are provided for general information and may change or be removed at any time.
        A listing does not constitute an offer of employment, and we may modify role details and
        requirements.
      </p>

      <h2>4. Application submissions</h2>
      <p>
        Submitting an application does not guarantee an interview or employment. All applications are
        assessed against role requirements and current hiring needs. Only shortlisted candidates may
        be contacted.
      </p>

      <h2>5. Intellectual property</h2>
      <p>
        The content, design, logos, and materials on this website are owned by or licensed to us and
        are protected by applicable laws. You may not copy, reproduce, or distribute them without
        permission, except as necessary to use the site for its intended purpose.
      </p>

      <h2>6. Prohibited activities</h2>
      <ul>
        <li>Attempting to gain unauthorized access to the site or related systems.</li>
        <li>Uploading malicious code or content, or submitting spam.</li>
        <li>Scraping or harvesting data without permission.</li>
        <li>Using the site in any way that violates applicable laws.</li>
      </ul>

      <h2>7. External links</h2>
      <p>
        The site may contain links to third-party websites. We are not responsible for the content
        or practices of those sites and provide such links for convenience only.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for any indirect or consequential
        loss arising from your use of, or inability to use, the website. The site is provided on an
        &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
      </p>

      <h2>9. Website availability</h2>
      <p>
        We aim to keep the site available but do not guarantee uninterrupted access. We may suspend,
        withdraw, or restrict availability for maintenance or other reasons.
      </p>

      <h2>10. Updates to these terms</h2>
      <p>
        We may update these terms from time to time. Continued use of the site after changes
        constitutes acceptance of the updated terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
