import Link from "next/link";
import { faqs } from "@/config/content";
import { siteConfig } from "@/config/site";
import { images } from "@/config/images";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Icon } from "@/components/Icon";
import { Accent, Arc, DotGrid, ResponsiveImage, SectionLabel } from "@/components/ui/marketing";

/**
 * Frequently asked questions.
 *
 * A cooler, slightly blue-grey wash rather than the cream of the sections
 * around it, so the eye reads it as a different kind of section: reference,
 * not pitch.
 */
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="section-pad relative overflow-hidden bg-gradient-to-b from-[#F5F7FB] via-[#F7F7F7] to-cream-100"
    >
      <Arc className="-right-56 -top-56 h-[30rem] w-[30rem]" opacity={0.4} />
      <DotGrid className="left-8 top-28 hidden lg:block" cols={4} rows={4} />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>FAQ</SectionLabel>
          <h2 id="faq-title" className="h-section mt-4 text-balance">
            Frequently asked <Accent>questions</Accent>
          </h2>
          <p className="lead mx-auto mt-4 max-w-2xl text-pretty">
            Answers to the questions candidates ask us most often. Can&apos;t find what you need?
            We&apos;re happy to help.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Photo, and the way to a person */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md pb-28 lg:sticky lg:top-28 lg:max-w-none">
              <span
                aria-hidden="true"
                className="absolute -left-6 top-6 h-[78%] w-[92%] rounded-[50%_50%_44%_56%/56%_46%_54%_44%] bg-gradient-to-br from-brand-100 to-brand-50/40"
              />
              <div className="relative aspect-[4/3.1] overflow-hidden rounded-[1.75rem] shadow-lift-lg ring-1 ring-white/70">
                <ResponsiveImage
                  image={images.faq}
                  sizes="(min-width: 1024px) 460px, 92vw"
                  className="object-[60%_center]"
                />
              </div>

              <div className="absolute inset-x-3 bottom-0 rounded-2xl bg-white/95 p-5 shadow-lift-lg ring-1 ring-cream-300/70 backdrop-blur sm:inset-x-6 sm:p-6">
                <div className="flex items-start gap-4">
                  <span aria-hidden="true" className="icon-tile h-12 w-12 rounded-full">
                    <Icon name="headset" className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-navy-900">
                      Still have questions?
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-navy-600">
                      Our recruitment team will get back to you as soon as possible.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                  <a
                    href={`mailto:${siteConfig.contact.recruitmentEmail}`}
                    className="btn-brand group flex-1 !min-h-[44px] !text-sm"
                  >
                    Email our team
                    <Icon
                      name="arrowRight"
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </a>
                  <Link href="/#contact" className="btn-line flex-1 !min-h-[44px] !text-sm">
                    Contact page
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* The questions */}
          <div className="lg:col-span-7">
            <FaqAccordion items={faqs} />
          </div>
        </div>
      </div>
    </section>
  );
}
