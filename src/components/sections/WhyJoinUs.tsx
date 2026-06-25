import Link from "next/link";
import { benefits } from "@/config/content";
import { Reveal } from "@/components/Reveal";
import { Icon, type IconName } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

export function WhyJoinUs() {
  return (
    <section id="why-join-us" className="section bg-navy-50/60">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Sticky intro */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <span className="pill uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Why Join Us
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
                Benefits that support your career and wellbeing
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
                We invest in our people with training, growth opportunities, and a
                supportive, modern working environment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <ApplyButton label="Apply Now" />
                <Link href="/#open-positions" className="btn-secondary">
                  View open roles
                </Link>
              </div>

              <p className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-navy-500">
                <Icon name="checkCircle" className="h-4 w-4 text-brand-600" />
                {benefits.length} reasons to build your career here
              </p>
            </div>
          </div>

          {/* Benefits grid */}
          <div className="lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit, i) => (
                <Reveal key={benefit.title} delay={(i % 2) * 60}>
                  <article className="group flex h-full gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white group-hover:shadow-glow">
                      <Icon name={benefit.icon as IconName} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-navy-900">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-navy-600">
                        {benefit.description}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
