import { siteConfig, formatAddress } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { ContactForm } from "@/components/forms/ContactForm";
import { Accent, Arc, DotGrid, Glow, SectionLabel } from "@/components/ui/marketing";

export function ContactSection() {
  const { contact } = siteConfig;
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-cream-100 to-[#FBF6EC]"
    >
      <Glow className="-left-48 -top-24 h-[30rem] w-[30rem]" />
      <Glow className="-bottom-48 -right-40 h-[30rem] w-[30rem] opacity-80" />
      <Arc className="-right-72 top-20 hidden h-[30rem] w-[30rem] lg:block" opacity={0.45} />
      <DotGrid className="right-10 top-16 hidden lg:block" cols={5} rows={3} />
      <DotGrid className="bottom-24 left-6 hidden lg:block" cols={4} rows={4} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Contact</SectionLabel>
          <h2 id="contact-title" className="h-section mt-4 text-balance">
            Get in touch with our <Accent>team</Accent>
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-pretty">
            Have a question about a role or the application process? We are here to help.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 [&>*]:min-w-0">
          {/* How to reach us */}
          <div>
            <h3 className="font-display text-xl font-extrabold tracking-[-0.02em] text-navy-900 sm:text-2xl">
              Contact information
            </h3>
            <p className="mt-1.5 text-sm text-navy-600">
              Reach our recruitment team through any of these channels.
            </p>

            <ul className="mt-6 space-y-3.5">
              <ContactCard
                icon="mail"
                label="Recruitment email"
                href={`mailto:${contact.recruitmentEmail}`}
                highlight
              >
                {contact.recruitmentEmail}
              </ContactCard>
              <ContactCard
                icon="phone"
                label="Phone"
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                highlight
              >
                {contact.phone}
              </ContactCard>
              <ContactCard icon="mapPin" label="Office address">
                {formatAddress()}
              </ContactCard>
              <ContactCard icon="clock" label="Business hours">
                {contact.businessHours}
              </ContactCard>
            </ul>

            {siteConfig.social.length ? (
              <div className="mt-6 flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                  Follow us
                </span>
                {siteConfig.social.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy-700 shadow-soft ring-1 ring-cream-300 transition hover:-translate-y-0.5 hover:text-brand-700 hover:ring-brand-300"
                  >
                    <Icon name={s.icon as IconName} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* The form */}
          <div className="rounded-[1.75rem] bg-white p-5 shadow-lift-lg ring-1 ring-cream-300/70 sm:p-8 lg:p-9">
            <ContactForm bare />
          </div>
        </div>

        {/* Optional map */}
        {contact.mapEmbedUrl ? (
          <iframe
            title="Office location map"
            src={contact.mapEmbedUrl}
            loading="lazy"
            className="mt-8 h-72 w-full rounded-2xl border border-cream-300"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * One way to reach us. Those that go somewhere — email, phone — are links in
 * their own right, with the chevron that says so.
 */
function ContactCard({
  icon,
  label,
  href,
  highlight = false,
  children,
}: {
  icon: IconName;
  label: string;
  href?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 transition duration-300 group-hover:bg-brand-500 group-hover:text-white"
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-navy-900">{label}</span>
        <span
          className={`mt-0.5 block [overflow-wrap:anywhere] ${
            highlight
              ? "font-display text-base font-extrabold text-brand-800 sm:text-[17px]"
              : "text-sm leading-relaxed text-navy-600"
          }`}
        >
          {children}
        </span>
      </span>
      {href ? (
        <Icon
          name="chevronRight"
          className="h-5 w-5 shrink-0 text-navy-400 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      ) : null}
    </>
  );
  const cls = "card-soft group flex items-center gap-4 p-4 sm:p-5";
  return (
    <li>
      {href ? (
        <a href={href} className={`${cls} card-hover`}>
          {body}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
