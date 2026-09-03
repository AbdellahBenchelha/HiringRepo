import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";
import { updatedLabel } from "@/config/pageUpdated";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How WorkRoute collects, uses, stores, and protects personal information, and the rights available to individuals.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const { company, contact, legal } = siteConfig;
  const months = legal.applicantDataRetentionMonths;
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated={updatedLabel("/privacy-policy")}
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
        <li>
          The country your application was sent from, derived from your network (IP) address at
          the moment you apply. We record the country only — your IP address itself is not
          retained.
        </li>
        <li>
          If you are offered a role and accept it: the details you confirm at that point, which
          include your nationality, your identity or passport document number, your full
          residential address and postcode, and — if you are engaging through a company — that
          company&rsquo;s name, registration number and tax number.
        </li>
        <li>
          Identity verification documents, where required: an image of an official identity
          document and a photograph of you holding it. This is requested only from applicants in
          certain countries, and only after the online assessment.
        </li>
      </ul>

      <h2>1a. Identity verification</h2>
      <p>
        For some roles and locations we ask applicants to confirm their identity before the
        application continues. Where this applies, you are asked for an image of an official
        identity document — a passport, national identity card or driver&rsquo;s licence — and a
        photograph of yourself holding it.
      </p>
      <p>
        A photograph used to confirm that you are the person shown on a document is biometric
        data. We ask for your explicit consent before collecting it, separately from any other
        consent, and you are told what it is for at the point we ask. We use these images only to
        confirm your identity and to prevent the same person applying repeatedly under different
        details. They are never used for automated facial recognition, never sold, and never
        shared outside our recruitment team.
      </p>
      <p>
        Images are stored encrypted and access is restricted to recruitment staff. They are
        deleted once a verification decision has been made and there is no longer a need to keep
        them; the outcome of the decision is retained as part of your application record. You may
        withdraw consent and ask us to delete these images at any time by writing to{" "}
        <a href={`mailto:${contact.privacyEmail}`}>{contact.privacyEmail}</a>, and we will do so
        unless we are required to keep them by law.
      </p>

      <h2>1b. Public company records</h2>
      <p>
        For some applications we search the public register of company officers kept by Companies
        House, the United Kingdom registrar, using your name and — where we hold it — the month and
        year of your date of birth. This tells us whether you already act as a director or
        secretary of a UK company, which affects how an engagement with us would be arranged.
      </p>
      <p>
        We search only information Companies House publishes to anyone, we record the result
        against your application, and a search is run by a member of our recruitment team when it
        is relevant rather than automatically for every applicant. A name can be shared by many
        people, so any match is treated as something to check and never as a fact about you, and
        it is never the reason an application is refused.
      </p>

      <h2>2. Why we collect information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Receive, assess, and manage job applications.</li>
        <li>Communicate with you about your application and the recruitment process.</li>
        <li>Operate, secure, and improve our website.</li>
        <li>Comply with applicable legal and regulatory obligations.</li>
        <li>Where you have opted in, send you future recruitment updates.</li>
      </ul>
      <p>
        The country derived from your network address is used only to compare against the country
        you selected on the form, because these roles are open in specific locations. A difference
        is never treated as a decision in itself — a VPN, a work network or simply travelling all
        produce one — and no application is rejected automatically because of it. We do not derive
        your city, region or location beyond the country, and we do not store your IP address.
      </p>

      <h2>2a. Details confirmed when you accept an offer</h2>
      <p>
        If we offer you a role, the acceptance link in your offer email asks you to check the
        details we already hold and correct anything that is out of date, and to supply the few
        further details needed to draw up an agreement — your nationality, your identity document
        number, your full address, and your company details if you are engaging through one.
      </p>
      <p>
        This information is used to prepare and administer your agreement with us, and for no
        other purpose. Your earlier application record is kept alongside it rather than
        overwritten, so that both remain accurate. We will never ask you for a payment, a bank
        card, or a password at any stage; bank details are requested only after a written
        agreement has been signed, and never through this form.
      </p>

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
