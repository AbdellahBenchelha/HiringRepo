import Link from "next/link";
import { siteConfig, formatAddress } from "@/config/site";
import { footerNav } from "@/config/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { BackToTop } from "@/components/layout/BackToTop";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { DotGrid } from "@/components/ui/marketing";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-display text-[15px] font-bold text-white">{title}</h3>
      <ul className="mt-4 space-y-1">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="inline-flex min-h-[32px] items-center text-sm text-navy-200 transition hover:translate-x-0.5 hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The footer. Every link in it is a page that exists — no newsletter, no
 * accounts that are not ours, no blog.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const { contact } = siteConfig;
  return (
    <footer className="relative isolate overflow-hidden bg-navy-900 text-navy-200">
      {/* Decoration: soft navy circles and fine amber arcs at the edges */}
      <span
        aria-hidden="true"
        className="absolute -left-24 -top-24 -z-10 h-64 w-64 rounded-full bg-navy-800/70"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-32 -right-24 -z-10 h-80 w-80 rounded-full bg-navy-800/60"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        fill="none"
        className="absolute inset-0 -z-10 h-full w-full"
      >
        <path d="M-30 90c70 40 110 140 80 300" stroke="#F5A623" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M1470 120c-60 40-90 130-60 290" stroke="#F5A623" strokeOpacity="0.4" strokeWidth="1.5" />
      </svg>
      <DotGrid className="right-10 top-10 hidden lg:block" cols={5} rows={3} tone="white" />

      <div className="container-page py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4 lg:pr-6">
            <Link
              href="/#home"
              className="inline-flex items-center gap-2 rounded-lg"
              aria-label={`${siteConfig.company.name} home`}
            >
              <Logo className="h-9 w-9" />
              <span className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-white">
                {siteConfig.company.shortName}
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-200">
              {siteConfig.company.tagline}
            </p>
            {siteConfig.social.length ? (
              <div className="mt-5 flex items-center gap-2">
                {siteConfig.social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.07] text-white ring-1 ring-inset ring-white/10 transition hover:-translate-y-0.5 hover:bg-brand-500 hover:text-navy-900"
                  >
                    <Icon name={s.icon as IconName} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}

            <ul className="mt-6 space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <a href={`mailto:${contact.recruitmentEmail}`} className="transition hover:text-white">
                  {contact.recruitmentEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="transition hover:text-white">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{formatAddress()}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{contact.businessHours}</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 lg:border-l lg:border-white/10 lg:pl-8">
            <FooterColumn title="Company" links={footerNav.company} />
          </div>
          <div className="lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-8">
            <FooterColumn title="Candidate Resources" links={footerNav.candidateResources} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 lg:border-l lg:border-white/10 lg:pl-8">
            <FooterColumn title="Legal" links={footerNav.legal} />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
          {/* The registered name, number and office on every page: the
              disclosure UK company law asks of a company's website, and the
              fastest way for somebody checking a recruiter to find us on the
              register. */}
          <p className="text-xs leading-relaxed text-navy-300">
            © {year} {siteConfig.legal.registeredName}, trading as {siteConfig.legal.tradingName}. All
            rights reserved.
            <span className="mt-1 block">
              Registered in {siteConfig.legal.registeredIn}, company no.{" "}
              {siteConfig.legal.registrationNumber}. Registered office:{" "}
              {siteConfig.legal.registeredAddress}.
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <CookiePreferencesLink className="text-navy-200 transition hover:text-white" />
            <Link href="/accessibility" className="text-navy-200 transition hover:text-white">
              Accessibility
            </Link>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
