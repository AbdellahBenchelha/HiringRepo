import { siteConfig, formatAddress } from "@/config/site";
import { Icon, type IconName } from "@/components/Icon";
import { ContactForm } from "@/components/forms/ContactForm";

export function ContactSection() {
  const { contact } = siteConfig;
  return (
    <section id="contact" className="section bg-white">
      <div className="container-page">
        {/* Header */}
        <div className="max-w-2xl">
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

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          {/* Contact details */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-navy-100 bg-white p-6 shadow-soft sm:p-7">
              <ul className="divide-y divide-navy-100">
                <ContactRow icon="mail" label="Recruitment email">
                  <a href={`mailto:${contact.recruitmentEmail}`} className="hover:text-brand-700">
                    {contact.recruitmentEmail}
                  </a>
                </ContactRow>
                <ContactRow icon="mail" label="General support">
                  <a href={`mailto:${contact.supportEmail}`} className="hover:text-brand-700">
                    {contact.supportEmail}
                  </a>
                </ContactRow>
                <ContactRow icon="phone" label="Phone">
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-brand-700">
                    {contact.phone}
                  </a>
                </ContactRow>
                <ContactRow icon="mapPin" label="Office address">
                  {formatAddress()}
                </ContactRow>
                <ContactRow icon="clock" label="Business hours">
                  {contact.businessHours}
                </ContactRow>
              </ul>

              <div className="mt-6 border-t border-navy-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700 transition hover:bg-brand-50 hover:text-brand-700"
                    >
                      <Icon name={s.icon as IconName} className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Map */}
            {contact.mapEmbedUrl ? (
              <iframe
                title="Office location map"
                src={contact.mapEmbedUrl}
                loading="lazy"
                className="h-64 w-full rounded-2xl border border-navy-100"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 p-6 text-center text-sm text-navy-500">
                <span>
                  <Icon name="mapPin" className="mx-auto mb-2 h-6 w-6 text-navy-400" />
                  {formatAddress()}
                </span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
        <p className="mt-0.5 break-words text-sm text-navy-800">{children}</p>
      </div>
    </li>
  );
}
