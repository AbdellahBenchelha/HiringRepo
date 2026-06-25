import Link from "next/link";
import { faqs } from "@/config/content";
import { siteConfig } from "@/config/site";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Icon } from "@/components/Icon";

export function Faq() {
  return (
    <section id="faq" className="section bg-navy-50/60">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Sticky intro */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <span className="pill uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                FAQ
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
                Answers to the questions candidates ask us most often. Can&apos;t
                find what you need? We&apos;re happy to help.
              </p>

              <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-6 shadow-soft">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name="headset" className="h-6 w-6" />
                </span>
                <p className="mt-4 text-base font-semibold text-navy-900">
                  Still have questions?
                </p>
                <p className="mt-1 text-sm leading-relaxed text-navy-600">
                  Our recruitment team will get back to you as soon as possible.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <a
                    href={`mailto:${siteConfig.contact.recruitmentEmail}`}
                    className="btn-primary"
                  >
                    Email our team
                  </a>
                  <Link href="/#contact" className="btn-secondary">
                    Contact page
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Accordion */}
          <div className="lg:col-span-7">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </section>
  );
}
