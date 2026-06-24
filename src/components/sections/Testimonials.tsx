import { testimonials } from "@/config/content";
import { SectionHeading } from "@/components/SectionHeading";
import { TestimonialCard } from "@/components/cards/TestimonialCard";
import { Reveal } from "@/components/Reveal";

export function Testimonials() {
  return (
    <section id="testimonials" className="section bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow="Life at NexaCare"
          title="What our team says"
          description="Hear from people who have built their careers with us."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 80}>
              <TestimonialCard testimonial={t} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
