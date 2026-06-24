import { faqs } from "@/config/content";
import { SectionHeading } from "@/components/SectionHeading";
import { FaqAccordion } from "@/components/FaqAccordion";

export function Faq() {
  return (
    <section id="faq" className="section bg-navy-50/60">
      <div className="container-page">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Answers to the questions candidates ask us most often."
        />
        <div className="mx-auto mt-12 max-w-3xl">
          <FaqAccordion items={faqs} />
        </div>
      </div>
    </section>
  );
}
