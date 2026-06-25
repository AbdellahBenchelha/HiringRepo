import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Applicant Privacy Notice",
  description:
    "How WorkRoute uses job-applicant information, CVs, employment history, education, interview notes, and assessments during recruitment.",
  path: "/applicant-privacy",
});

export default function ApplicantPrivacyPage() {
  const { company, contact, legal } = siteConfig;
  const months = legal.applicantDataRetentionMonths;
  return (
    <LegalPageLayout
      title="Applicant Privacy Notice"
      lastUpdated="Review before publishing"
      intro={`This notice explains specifically how ${company.name} uses the information you provide when you apply for a role.`}
    >
      <h2>1. Information we process about applicants</h2>
      <ul>
        <li>Contact details: name, email, phone number, country, city, and address.</li>
        <li>Application preferences: position, work arrangement, employment type, and schedule.</li>
        <li>Language skills and proficiency levels.</li>
        <li>Employment history, job titles, dates, responsibilities, and tools used.</li>
        <li>Education, qualifications, and certifications.</li>
        <li>CV/résumé, cover letter, and supporting documents you choose to upload.</li>
        <li>Your answers to application questions.</li>
        <li>Interview notes and the results of any language or skills assessments.</li>
      </ul>

      <h2>2. How we use applicant information</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Assess your skills, experience, and suitability for the role(s) you apply to.</li>
        <li>Communicate with you and schedule interviews or assessments.</li>
        <li>Record and compare candidate evaluations fairly and consistently.</li>
        <li>Make hiring decisions and, where successful, begin onboarding.</li>
        <li>Keep you informed about future opportunities, where you have opted in.</li>
      </ul>

      <h2>3. Interview notes and assessments</h2>
      <p>
        During the process we may create interview notes and record assessment results. These are
        used solely to evaluate your application and are accessible only to authorized members of the
        recruitment and hiring teams.
      </p>

      <h2>4. Providing information is voluntary</h2>
      <p>
        Providing application information is voluntary, but some details are necessary to assess your
        application. A CV is optional. If you choose not to provide required information, we may be
        unable to consider your application for certain roles.
      </p>

      <h2>5. Retention of applicant data</h2>
      <p>
        We retain applicant information for approximately <strong>{months} months</strong> following
        a recruitment decision, after which it is securely deleted or anonymized, unless a longer
        period is required or permitted by law, or you have consented to us keeping it to consider
        you for future roles. You may request deletion at any time.
      </p>

      <h2>6. Who can access applicant data</h2>
      <p>
        Access is limited to authorized recruitment and hiring personnel and to trusted service
        providers that host our systems and storage on our behalf, under appropriate confidentiality
        obligations.
      </p>

      <h2>7. Your rights and how to exercise them</h2>
      <p>
        Subject to applicable law, you may request access to, correction of, or deletion of your
        applicant data, and you may withdraw consent at any time. Contact us at{" "}
        <a href={`mailto:${contact.privacyEmail}`}>{contact.privacyEmail}</a>.
      </p>

      <h2>8. Related policies</h2>
      <p>
        Please also read our <a href="/privacy-policy">Privacy Policy</a> and{" "}
        <a href="/data-retention">Data Retention Policy</a>.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
