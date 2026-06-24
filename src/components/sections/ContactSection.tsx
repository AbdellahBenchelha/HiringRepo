import { siteConfig, formatAddress } from "@/config/site";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/Icon";
import { ContactForm } from "@/components/forms/ContactForm";

export function ContactSection() {
  const { contact } = siteConfig;
  return (
    <section id="contact" className="section bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow="Contact"
          title="Get in touch with our team"
          description="Have a question about a role or the application process? We are here to help."
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <ul className="space-y-4">
              <ContactRow icon="mail" label="Recruitment email">
                <a href={`mailto:${contact.recruitmentEmail}`} className="text-brand-700 hover:underline">
                  {contact.recruitmentEmail}
                </a>
              </ContactRow>
              <ContactRow icon="mail" label="General support email">
                <a href={`mailto:${contact.supportEmail}`} className="text-brand-700 hover:underline">
                  {contact.supportEmail}
                </a>
              </ContactRow>
              <ContactRow icon="phone" label="Phone">
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="text-brand-700 hover:underline">
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

            <div className="flex items-center gap-2">
              {siteConfig.social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  <Icon name={s.icon as never} className="h-4 w-4" />
                </a>
              ))}
            </div>

            {/* Map placeholder — only shown if a map embed URL is configured. */}
            {contact.mapEmbedUrl ? (
              <iframe
                title="Office location map"
                src={contact.mapEmbedUrl}
                loading="lazy"
                className="h-64 w-full rounded-2xl border border-navy-100"
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 text-center text-sm text-navy-500">
                <span>
                  <Icon name="mapPin" className="mx-auto mb-2 h-6 w-6 text-navy-400" />
                  Map placeholder — add a Google Maps embed URL in
                  <code className="mx-1 rounded bg-white px-1 py-0.5 text-xs">siteConfig.contact.mapEmbedUrl</code>
                </span>
              </div>
            )}
          </div>

          <ContactForm />
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
  icon: "mail" | "phone" | "mapPin" | "clock";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</p>
        <p className="text-sm text-navy-800">{children}</p>
      </div>
    </li>
  );
}
