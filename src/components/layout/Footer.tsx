import Link from "next/link";
import { siteConfig, formatAddress } from "@/config/site";
import { footerNav } from "@/config/navigation";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/layout/Logo";
import { BackToTop } from "@/components/layout/BackToTop";
import { CookiePreferencesLink } from "@/components/cookies/CookiePreferencesLink";
import { DotGrid } from "@/components/ui/marketing";

function FooterColumn({
  title,
  links,
  className = "",
  split = false,
}: {
  title: string;
  links: { label: string; href: string }[];
  className?: string;
  /** Two columns of links on a phone, for a long list. */
  split?: boolean;
}) {
  return (
    <div className={className}>
      <h3 className="font-display text-[17px] font-extrabold tracking-[-0.015em] text-white xl:whitespace-nowrap">{title}</h3>
      <ul className={`mt-4 sm:mt-5 ${split ? "grid grid-cols-2 gap-x-6 gap-y-1.5 sm:block sm:space-y-1.5" : "space-y-1.5"}`}>
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="inline-flex min-h-[34px] items-center text-[14px] text-navy-200 sm:text-[15px] transition duration-200 hover:translate-x-0.5 hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The company name with its last word in amber, as in the approved design. */
function Wordmark() {
  const name = siteConfig.company.shortName;
  const accent = name.endsWith("Route") ? "Route" : "";
  return (
    <span className="font-display text-[1.625rem] font-extrabold tracking-[-0.035em] text-white">
      {accent ? name.slice(0, -accent.length) : name}
      {accent ? <span className="text-brand-400">{accent}</span> : null}
    </span>
  );
}

/**
 * The footer. Every link in it is a page that exists — no newsletter, no
 * accounts that are not ours, no blog. On a wide screen five columns with
 * fine dividers; on a laptop the brand and the contact block share the first
 * row; on a phone everything stacks.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const { contact } = siteConfig;
  return (
    <footer className="relative isolate overflow-hidden bg-navy-900 text-navy-200">
      {/* Decoration: navy circles, fine amber arcs, dots, a soft wave */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -left-24 -top-36 h-80 w-80 rounded-full bg-navy-800/80" />
        <span className="absolute -bottom-40 right-[-10%] h-96 w-[46rem] rotate-[-14deg] rounded-[50%] bg-navy-800/50" />
        <svg viewBox="0 0 1440 520" preserveAspectRatio="none" fill="none" className="absolute inset-0 hidden h-full w-full md:block">
          <path d="M-20 160c80 40 120 140 90 280" stroke="#F5A623" strokeOpacity="0.45" strokeWidth="1.5" />
          <path d="M1460 90c-80 50-110 150-80 270" stroke="#F5A623" strokeOpacity="0.45" strokeWidth="1.5" />
        </svg>
      </div>
      <DotGrid className="right-12 top-10 hidden md:block" cols={5} rows={3} tone="white" />
      <DotGrid className="bottom-24 left-0 hidden md:block" cols={4} rows={3} tone="white" />

      <div className="container-page pb-8 pt-14 sm:pt-16 lg:pt-20">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3 lg:gap-x-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_minmax(0,1.08fr)_minmax(0,1.1fr)_minmax(0,1.3fr)] xl:gap-0">
          {/* Brand */}
          <div className="col-span-2 xl:col-span-1 xl:pr-8">
            <Link
              href="/#home"
              className="inline-flex items-center gap-2 rounded-lg"
              aria-label={`${siteConfig.company.name} home`}
            >
              <Logo className="h-9 w-9" />
              <Wordmark />
            </Link>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-navy-200">
              {siteConfig.company.tagline}
            </p>
            {siteConfig.social.length ? (
              <div className="mt-6 flex items-center gap-3">
                {siteConfig.social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-inset ring-white/10 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-500 hover:text-navy-900"
                  >
                    <Icon name={s.icon as IconName} className="h-5 w-5" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <FooterColumn
            title="Company"
            links={footerNav.company}
            className="xl:border-l xl:border-white/10 xl:px-6"
          />
          <FooterColumn
            title="Candidate Resources"
            links={footerNav.candidateResources}
            className="xl:border-l xl:border-white/10 xl:px-6"
          />
          <FooterColumn
            title="Legal"
            links={footerNav.legal}
            split
            className="col-span-2 sm:col-span-1 xl:border-l xl:border-white/10 xl:px-6"
          />

          {/* Contact: beside the brand on a laptop, the last column on a wide screen */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 lg:col-start-3 lg:row-start-1 xl:col-start-auto xl:row-start-auto xl:border-l xl:border-white/10 xl:pl-6">
            <h3 className="font-display text-[17px] font-extrabold tracking-[-0.015em] text-white">Get in touch</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-navy-200">
              Have a question about a role or the application process? We are here to help.
            </p>
            <div className="mt-5 space-y-2.5">
              <a
                href={`mailto:${contact.recruitmentEmail}`}
                className="flex min-h-[50px] items-center gap-3 rounded-xl bg-white/[0.04] px-4 text-[15px] text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.08] hover:ring-white/30"
              >
                <Icon name="mailLine" className="h-5 w-5 shrink-0 text-brand-400" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{contact.recruitmentEmail}</span>
              </a>
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="flex min-h-[50px] items-center gap-3 rounded-xl bg-white/[0.04] px-4 text-[15px] text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/[0.08] hover:ring-white/30"
              >
                <Icon name="phoneLine" className="h-5 w-5 shrink-0 text-brand-400" />
                {contact.phone}
              </a>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed">
              <li className="flex items-start gap-2.5">
                <Icon name="mapPinLine" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{formatAddress()}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="clockLine" className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                <span>{contact.businessHours}</span>
              </li>
            </ul>
            <Link href="/#contact" className="btn-brand group mt-5 w-full !min-h-[52px]">
              Contact us
              <Icon
                name="arrowRight"
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-white/10 pt-7 xl:flex-row xl:items-center xl:justify-between xl:gap-10">
          {/* The registered name, number and office on every page: the
              disclosure UK company law asks of a company's website, and the
              fastest way for somebody checking a recruiter to find us on the
              register. */}
          <p className="text-[13px] leading-relaxed text-navy-300">
            © {year} {siteConfig.legal.registeredName}, trading as {siteConfig.legal.tradingName}. All
            rights reserved.
            <span className="mt-1 block">
              Registered in {siteConfig.legal.registeredIn}, company no.{" "}
              {siteConfig.legal.registrationNumber}. Registered office:{" "}
              {siteConfig.legal.registeredAddress}.
            </span>
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 whitespace-nowrap text-sm">
            <CookiePreferencesLink className="text-navy-200 transition hover:text-white" />
            <span aria-hidden="true" className="hidden h-4 w-px bg-white/20 sm:block" />
            <Link href="/accessibility" className="text-navy-200 transition hover:text-white">
              Accessibility
            </Link>
            <span aria-hidden="true" className="hidden h-4 w-px bg-white/20 sm:block" />
            <BackToTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
