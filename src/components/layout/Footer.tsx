import Link from "next/link";
import { siteConfig, formatAddress } from "@/config/site";
import { footerNav } from "@/config/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { BackToTop } from "@/components/layout/BackToTop";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="text-sm text-navy-200 transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy-900 text-navy-200">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="flex flex-col leading-tight">
                <span className="text-lg font-bold tracking-tight text-white">
                  {siteConfig.company.shortName}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                  Support Solutions
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              {siteConfig.company.tagline}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {siteConfig.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <Icon name={s.icon as IconName} className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterColumn title="Company" links={footerNav.company} />
          <FooterColumn title="Candidate Resources" links={footerNav.candidateResources} />
          <FooterColumn title="Legal" links={footerNav.legal} />

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <a href={`mailto:${siteConfig.contact.recruitmentEmail}`} className="hover:text-white">
                  {siteConfig.contact.recruitmentEmail}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <a href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`} className="hover:text-white">
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span>{formatAddress()}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                <span>{siteConfig.contact.businessHours}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-navy-400">
            © {year} {siteConfig.legal.registeredName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <CookiePreferencesLink className="text-navy-300 transition hover:text-white" />
            <Link href="/accessibility" className="text-navy-300 transition hover:text-white">
              Accessibility
            </Link>
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
