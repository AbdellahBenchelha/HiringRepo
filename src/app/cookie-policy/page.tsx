import { buildMetadata } from "@/lib/seo";
import { LegalPageLayout, LegalReviewNotice } from "@/components/legal/LegalPageLayout";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";

export const metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "Learn about the cookies used on the WorkRoute website and how to manage your cookie preferences.",
  path: "/cookie-policy",
});

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout
      title="Cookie Policy"
      lastUpdated="Review before publishing"
      intro="This policy describes the cookies and similar technologies used on this website and how you can control them."
    >
      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files placed on your device when you visit a website. They help the
        site function and can provide information to the site owner.
      </p>

      <h2>2. Types of cookies we use</h2>
      <h3>Essential cookies</h3>
      <p>
        Required for the website to work, such as remembering your cookie choices and keeping the
        site secure. These are always active and cannot be switched off.
      </p>
      <h3>Analytics cookies</h3>
      <p>
        Help us understand how visitors use the site so we can improve it. These are only used with
        your consent.
      </p>
      <h3>Preference cookies</h3>
      <p>
        Remember choices you make, such as language or layout preferences, to personalize your
        experience. These are only used with your consent.
      </p>
      <h3>Marketing cookies</h3>
      <p>
        If used, these help deliver relevant recruitment messages and measure their effectiveness.
        They are only used with your consent.
      </p>

      <h2>3. Managing your choices</h2>
      <p>
        When you first visit, our cookie banner lets you accept all cookies, reject non-essential
        cookies, or customize your preferences. Non-essential cookies are not activated before you
        consent. You can change your choices at any time using the{" "}
        <CookiePreferencesLink className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800" />{" "}
        link, available here and in the footer.
      </p>
      <p>
        You can also manage or delete cookies through your browser settings. Blocking some cookies
        may affect how the site works.
      </p>

      <h2>4. Updates</h2>
      <p>
        We may update this Cookie Policy from time to time. Please check this page periodically for
        changes.
      </p>

      <LegalReviewNotice />
    </LegalPageLayout>
  );
}
