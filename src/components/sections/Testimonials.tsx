import { testimonials } from "@/config/content";
import { TestimonialCard } from "@/components/cards/TestimonialCard";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icon";

export function Testimonials() {
  const [featured, ...rest] = testimonials;

  return (
    <section id="testimonials" className="section bg-white">
      <div className="container-page">
        {/* Header with overall rating */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="pill uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Life at NexaCare
            </span>
            <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl lg:text-[2.75rem]">
              What our team says
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
              Hear directly from the people who have built their careers with us.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-navy-100 bg-navy-50/50 px-5 py-4">
            <div className="flex gap-0.5 text-amber-400" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" className="h-5 w-5" />
              ))}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-navy-900">Loved by our team</p>
              <p className="text-xs text-navy-500">{testimonials.length} team reviews</p>
            </div>
          </div>
        </div>

        {/* Featured + grid */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <TestimonialCard testimonial={featured} index={0} featured />
          </Reveal>
          {rest.map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 80}>
              <TestimonialCard testimonial={t} index={i + 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
