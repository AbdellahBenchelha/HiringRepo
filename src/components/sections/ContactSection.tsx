import { siteConfig, formatAddress } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { ContactForm } from "@/components/forms/ContactForm";

export function ContactSection() {
  const { contact } = siteConfig;
  return (
    <section id="contact" className="section bg-white">
      <div className="container-page">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="pill uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Contact
          </span>
          <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
            Get in touch with our team
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
            Have a question about a role or the application process? We are here
            to help.
          </p>
        </div>

        {/* Split card */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-card">
          <div className="grid lg:grid-cols-5">
            {/* Info panel */}
            <div className="relative flex flex-col overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-brand-900 p-8 text-white sm:p-10 lg:col-span-2">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_0%,black,transparent)]" />
                <div className="absolute -right-16 top-10 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
                <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-brand-600/20 blur-3xl" />
              </div>

              <div className="relative">
                <h3 className="text-xl font-bold tracking-tight">Contact information</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">
                  Reach our recruitment team through any of these channels.
                </p>

                <ul className="mt-8 space-y-5">
                  <InfoRow icon="mail" label="Recruitment email">
                    <a href={`mailto:${contact.recruitmentEmail}`} className="transition hover:text-brand-200">
                      {contact.recruitmentEmail}
                    </a>
                  </InfoRow>
                  <InfoRow icon="phone" label="Phone">
                    <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="transition hover:text-brand-200">
                      {contact.phone}
                    </a>
                  </InfoRow>
                  <InfoRow icon="mapPin" label="Office address">
                    {formatAddress()}
                  </InfoRow>
                  <InfoRow icon="clock" label="Business hours">
                    {contact.businessHours}
                  </InfoRow>
                </ul>
              </div>

              <div className="relative mt-8 border-t border-white/10 pt-6 lg:mt-auto">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-200/80">
                  Follow us
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {siteConfig.social.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/10 transition hover:bg-white/20"
                    >
                      <Icon name={s.icon as IconName} className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 sm:p-8 lg:col-span-3 lg:p-10">
              <ContactForm bare />
            </div>
          </div>
        </div>

        {/* Optional map */}
        {contact.mapEmbedUrl ? (
          <iframe
            title="Office location map"
            src={contact.mapEmbedUrl}
            loading="lazy"
            className="mt-6 h-72 w-full rounded-2xl border border-navy-100"
          />
        ) : null}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300 ring-1 ring-inset ring-white/10">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-200/80">{label}</p>
        <p className="mt-0.5 break-words text-sm text-white">{children}</p>
      </div>
    </li>
  );
}
