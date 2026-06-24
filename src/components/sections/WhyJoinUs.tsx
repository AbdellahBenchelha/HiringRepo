import { benefits } from "@/config/content";
import { SectionHeading } from "@/components/SectionHeading";
import { BenefitCard } from "@/components/cards/BenefitCard";
import { Reveal } from "@/components/Reveal";

export function WhyJoinUs() {
  return (
    <section id="why-join-us" className="section bg-navy-50/60">
      <div className="container-page">
        <SectionHeading
          eyebrow="Why Join Us"
          title="Benefits that support your career and wellbeing"
          description="We invest in our people with training, growth opportunities, and a supportive, modern working environment."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {benefits.map((benefit, i) => (
            <Reveal key={benefit.title} delay={(i % 4) * 60}>
              <BenefitCard benefit={benefit} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
