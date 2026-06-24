import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How NexaCare Support Solutions collects, uses, stores, and protects personal information, and the rights available to individuals.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const { company, contact, legal } = siteConfig;
  const months = legal.applicantDataRetentionMonths;
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="Review before publishing"
      intro={`This Privacy Policy explains how ${company.name} handles personal information collected through this website and during recruitment.`}
    >
      <h2>1. Information we collect</h2>
      <p>Depending on how you interact with us, we may collect:</p>
      <ul>
        <li>Identity and contact details (name, email, phone, country, city, address).</li>
        <li>Application details (position, work and schedule preferences, languages).</li>
        <li>Professional information (work experience, education, certifications, CV and documents).</li>
        <li>Responses to application questions and any information you choose to provide.</li>
        <li>Technical data (such as essential cookies needed for the site to function).</li>
      </ul>

      <h2>2. Why we collect information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Receive, assess, and manage job applications.</li>
        <li>Communicate with you about your application and the recruitment process.</li>
        <li>Operate, secure, and improve our website.</li>
        <li>Comply with applicable legal and regulatory obligations.</li>
        <li>Where you have opted in, send you future recruitment updates.</li>
      </ul>

      <h2>3. Recruitment-data processing</h2>
      <p>
        Information you submit through the application form is used to evaluate your suitability for
        the role(s) you apply to, to contact you, and to administer the hiring process. Please also
        read our <a href="/applicant-privacy">Applicant Privacy Notice</a>, which describes
        recruitment processing in more detail.
      </p>

      <h2>4. Legal basis for processing</h2>
      <p>
        Where applicable law requires a legal basis, we rely on your consent, the steps necessary to
        consider you for a role at your request, our legitimate interest in recruiting suitable
        candidates, and compliance with legal obligations. The specific legal basis may vary by
        jurisdiction.
      </p>

      <h2>5. How information is stored</h2>
      <p>
        Personal information is stored on systems operated by us or our service providers, using
        access controls and technical measures intended to protect it. Uploaded documents are
        intended to be stored in secured, restricted-access storage.
      </p>

      <h2>6. Who information may be shared with</h2>
      <ul>
        <li>Authorized members of our recruitment and hiring teams.</li>
        <li>Service providers that help us operate the website, storage, and email (processors).</li>
        <li>Authorities or third parties where required by law or to protect our rights.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>7. Your rights</h2>
      <p>
        Subject to applicable law, you may have the right to access, correct, update, or delete your
        personal information, to object to or restrict certain processing, to withdraw consent, and
        to request a copy of your data. To exercise these rights, contact us using the details
        below.
      </p>

      <h2>8. International data transfers</h2>
      <p>
        Because we support international businesses, your information may be processed in countries
        other than your own. Where this occurs, we take steps intended to ensure appropriate
        safeguards are in place.
      </p>

      <h2>9. Security measures</h2>
      <p>
        We use organizational and technical measures designed to protect personal information
        against unauthorized access, loss, or misuse. No method of transmission or storage is
        completely secure, and we cannot guarantee absolute security.
      </p>

      <h2>10. Data-retention periods</h2>
      <p>
        We retain applicant information for approximately {months} months after a recruitment
        decision, unless a longer period is required or permitted by law or you ask us to delete it
        sooner. See our <a href="/data-retention">Data Retention Policy</a> for details.
      </p>

      <h2>11. Cookies and analytics</h2>
      <p>
        We use essential cookies to operate the site and, only with your consent, analytics and
        other non-essential cookies. See our <a href="/cookie-policy">Cookie Policy</a> and use the
        cookie preferences link in the footer to manage your choices.
      </p>

      <h2>12. Contact for privacy requests</h2>
      <p>
        For privacy questions or requests, contact us at{" "}
        <a href={`mailto:${contact.privacyEmail}`}>{contact.privacyEmail}</a> or by post at{" "}
        {legal.registeredAddress}.
      </p>

      <h2>13. Updates to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by
        updating the &ldquo;last updated&rdquo; date on this page.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
