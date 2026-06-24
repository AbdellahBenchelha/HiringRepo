/** Primary navigation. Anchor links (#id) scroll within the home page. */
export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: "Home", href: "/#home" },
  { label: "About Us", href: "/#about" },
  { label: "Why Join Us", href: "/#why-join-us" },
  { label: "Open Positions", href: "/#open-positions" },
  { label: "Recruitment Process", href: "/#recruitment-process" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

export const footerNav = {
  company: [
    { label: "About Us", href: "/#about" },
    { label: "Careers", href: "/careers" },
    { label: "Open Positions", href: "/jobs" },
    { label: "Contact", href: "/#contact" },
  ],
  candidateResources: [
    { label: "Application Process", href: "/#recruitment-process" },
    { label: "FAQ", href: "/#faq" },
    { label: "Applicant Privacy Notice", href: "/applicant-privacy" },
    { label: "Accessibility", href: "/accessibility" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Terms and Conditions", href: "/terms" },
    { label: "Legal Notice", href: "/legal-notice" },
    { label: "Equal Opportunity Statement", href: "/equal-opportunity" },
    { label: "Data Retention Policy", href: "/data-retention" },
  ],
};
