import { siteConfig, formatAddress } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { ContactForm } from "@/components/forms/ContactForm";
import { Accent, DotGrid, SectionLabel } from "@/components/ui/marketing";

export function ContactSection() {
  const { contact } = siteConfig;
  const address = formatAddress();
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="section-pad relative isolate overflow-hidden bg-gradient-to-b from-[#FDF9F3] via-cream-100 to-[#FBF5EA]"
    >
      {/* Soft peach shapes at the edges, fine amber arcs, dots */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -left-40 top-10 h-[26rem] w-[22rem] rounded-[50%] bg-gradient-to-br from-[#FDE7CB] to-transparent opacity-80" />
        <span className="absolute -right-32 top-1/3 h-[28rem] w-[22rem] rounded-[50%] bg-gradient-to-bl from-[#FDE7CB] to-transparent opacity-70" />
        <span className="absolute -bottom-40 left-1/3 h-[18rem] w-[40rem] rounded-[50%] bg-[#FCEBD4]/60" />
        <svg
          viewBox="0 0 1440 1000"
          preserveAspectRatio="none"
          fill="none"
          className="absolute inset-0 hidden h-full w-full md:block"
        >
          <path d="M-20 170c90 50 120 170 110 320" stroke="#F5A623" strokeOpacity="0.55" strokeWidth="1.5" />
          <path d="M1460 80c-110 40-160 140-150 260M1300 640c50 50 100 80 160 90" stroke="#F5A623" strokeOpacity="0.5" strokeWidth="1.5" />
        </svg>
      </div>
      <DotGrid className="right-12 top-16 hidden lg:block" cols={5} rows={4} />
      <DotGrid className="left-6 top-1/3 hidden lg:block" cols={4} rows={4} />
      <DotGrid className="bottom-20 right-6 hidden lg:block" cols={3} rows={5} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>Contact</SectionLabel>
          <h2 id="contact-title" className="h-section mt-5 text-balance lg:!text-[3.25rem]">
            Get in touch with our <Accent>team</Accent>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-[clamp(1rem,0.94rem+0.35vw,1.1875rem)] leading-relaxed text-navy-500">
            Have a question about a role or the application process? We are here to help.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-10 xl:gap-12 [&>*]:min-w-0">
          {/* How to reach us */}
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-navy-900 sm:text-[2rem]">
              Contact information
            </h3>
            <p className="mt-2 text-[15px] text-navy-500 sm:text-base">
              Reach our recruitment team through any of these channels.
            </p>

            <ul className="mt-6 space-y-3.5">
              <ContactCard
                icon="mailLine"
                label="Recruitment Email"
                note="Send us an email anytime. We'll get back to you as soon as possible."
                href={`mailto:${contact.recruitmentEmail}`}
                highlight
              >
                {contact.recruitmentEmail}
              </ContactCard>
              <ContactCard
                icon="phone"
                label="Phone"
                note="Speak with our recruitment team."
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                highlight
              >
                {contact.phone}
              </ContactCard>
              <ContactCard
                icon="mapPin"
                label="Office Address"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                external
              >
                {address}
              </ContactCard>
              <ContactCard icon="clockLine" label="Business Hours">
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
          <div className="self-start rounded-[2rem] bg-white/95 p-6 shadow-[0_2px_6px_rgba(15,16,53,0.04),0_34px_70px_-34px_rgba(15,16,53,0.28)] ring-1 ring-white sm:p-9 lg:p-10">
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
 * One way to reach us. Those that go somewhere — email, phone, the map — are
 * links in their own right, with the chevron that says so.
 */
function ContactCard({
  icon,
  label,
  note,
  href,
  external = false,
  highlight = false,
  children,
}: {
  icon: IconName;
  label: string;
  note?: string;
  href?: string;
  external?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFEBCF] to-[#FFE1B8] text-brand-500 transition duration-300 group-hover:from-brand-400 group-hover:to-brand-500 group-hover:text-white sm:h-16 sm:w-16"
      >
        <Icon name={icon} className="h-[22px] w-[22px] sm:h-7 sm:w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[1.0625rem] font-extrabold tracking-[-0.01em] text-navy-900 sm:text-lg">
          {label}
        </span>
        {note ? <span className="mt-0.5 block text-sm leading-snug text-navy-500">{note}</span> : null}
        <span
          className={`mt-1 block [overflow-wrap:anywhere] ${
            highlight
              ? "font-display text-sm font-extrabold text-brand-700 min-[360px]:text-[15px] sm:text-[1.1875rem]"
              : "text-[15px] leading-relaxed text-navy-600"
          }`}
        >
          {children}
        </span>
      </span>
      {href ? (
        <Icon
          name="chevronRight"
          className="hidden h-5 w-5 shrink-0 text-navy-700 transition-transform duration-200 group-hover:translate-x-0.5 min-[360px]:block"
        />
      ) : null}
    </>
  );
  const cls =
    "group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-white to-[#FFFAF3] p-4 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_14px_34px_-24px_rgba(15,16,53,0.2)] ring-1 ring-[#F6E7D2] sm:gap-5 sm:p-5";
  return (
    <li>
      {href ? (
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={`${cls} transition duration-300 hover:-translate-y-0.5 hover:ring-brand-200`}
        >
          {body}
          {external ? <span className="sr-only"> (opens in Google Maps)</span> : null}
        </a>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
