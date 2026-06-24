import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Data Retention Policy",
  description:
    "How long NexaCare Support Solutions retains applications and recruitment records, and how data is securely deleted.",
  path: "/data-retention",
});

export default function DataRetentionPage() {
  const { legal, contact } = siteConfig;
  const months = legal.applicantDataRetentionMonths;
  return (
    <LegalPageLayout
      title="Data Retention Policy"
      lastUpdated="Review before publishing"
      intro="How long we keep recruitment records, and how we delete them securely."
    >
      <h2>1. Retention periods</h2>
      <p>
        We keep applicant information only for as long as necessary for the purposes for which it was
        collected. Unless a longer period is required or permitted by law, or you consent to us
        keeping your details to consider you for future roles, we retain recruitment records for
        approximately <strong>{months} months</strong> after a recruitment decision.
      </p>

      <h2>2. What this covers</h2>
      <ul>
        <li>Application form submissions and your responses.</li>
        <li>Uploaded CVs, cover letters, and supporting documents.</li>
        <li>Interview notes and assessment results.</li>
        <li>Correspondence relating to your application.</li>
      </ul>

      <h2>3. Secure deletion</h2>
      <p>
        When the retention period ends, records are securely deleted or anonymized so that you can no
        longer be identified from them. Documents in secure storage are removed according to our
        deletion procedures.
      </p>

      <h2>4. Requesting deletion</h2>
      <p>
        You can request deletion of your data at any time, subject to applicable law, by contacting{" "}
        <a href={`mailto:${contact.privacyEmail}`}>{contact.privacyEmail}</a>. We will action valid
        requests within a reasonable timeframe.
      </p>

      <h2>5. Configurable retention</h2>
      <p>
        The retention period is configurable in the website settings
        (<code>siteConfig.legal.applicantDataRetentionMonths</code>) and should be set to reflect the
        company&apos;s legal obligations and policies.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
