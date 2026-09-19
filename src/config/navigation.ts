/**
 * Primary navigation. Anchor links (#id) scroll within the home page.
 *
 * Grouped rather than flat. Seven links in a row is a list, not a navigation:
 * it fills the whole bar, gives every destination the same weight, and leaves
 * nowhere for the eye to land — which is most of what made the old header look
 * homemade. Four items, two of which open, says the same thing with a shape a
 * visitor can read at a glance.
 *
 * "Home" is gone on purpose: the logo has done that job on every site for
 * twenty years, and spending a slot restating it is the sort of thing that
 * reads as inexperience.
 */
export interface NavLink {
  label: string;
  href: string;
  /** One line under the label in the dropdown. Says what is there, not what it is called. */
  description?: string;
}

export interface NavItem {
  label: string;
  /** A destination of its own, or a group that opens. Exactly one of the two. */
  href?: string;
  children?: NavLink[];
}

export const mainNav: NavItem[] = [
  { label: "Open Positions", href: "/#open-positions" },
  {
    label: "Why WorkRoute",
    children: [
      { label: "About Us", href: "/#about", description: "Who we are and who we hire for." },
      {
        label: "Why Join Us",
        href: "/#why-join-us",
        description: "The pay, the hours and how the work actually runs.",
      },
    ],
  },
  {
    label: "How Hiring Works",
    children: [
      {
        label: "Recruitment Process",
        href: "/#recruitment-process",
        description: "Every step from application to signed agreement.",
      },
      { label: "FAQ", href: "/#faq", description: "The questions candidates ask us most." },
    ],
  },
];

/**
 * Set apart from the main group by a divider, the way a secondary audience is.
 *
 * Contact is not a step in the hiring path, and mixing it into that group made
 * the path look one item longer than it is.
 */
export const secondaryNav: NavLink[] = [{ label: "Contact", href: "/#contact" }];

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
