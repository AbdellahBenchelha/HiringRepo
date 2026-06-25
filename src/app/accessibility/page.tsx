import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata = buildMetadata({
  title: "Accessibility Statement",
  description:
    "WorkRoute is committed to making its recruitment website accessible to all candidates.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  const { company, contact } = siteConfig;
  return (
    <LegalPageLayout
      title="Accessibility Statement"
      lastUpdated="Review before publishing"
      intro={`${company.name} is committed to making this website accessible to as many people as possible.`}
    >
      <h2>Our commitment</h2>
      <p>
        We want everyone to be able to learn about our opportunities and apply with ease. We aim to
        follow widely recognized accessibility best practices and to continually improve the
        experience for users of assistive technologies.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Provide keyboard-accessible navigation and interactive components.</li>
        <li>Use clear, descriptive labels and visible focus indicators.</li>
        <li>Maintain readable text contrast and a logical heading structure.</li>
        <li>Provide text alternatives for meaningful images.</li>
        <li>Design forms with accessible labels and screen-reader-friendly error messages.</li>
      </ul>

      <h2>Need assistance?</h2>
      <p>
        If you experience any difficulty using this website, or you need a reasonable accommodation
        to complete the application process, please contact us at{" "}
        <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a> or call{" "}
        <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a>. We will do our best
        to provide the information or assistance you need in an alternative format.
      </p>

      <h2>Ongoing improvement</h2>
      <p>
        Accessibility is an ongoing effort. We welcome feedback and use it to improve the experience
        for all candidates.
      </p>
    </LegalPageLayout>
  );
}
