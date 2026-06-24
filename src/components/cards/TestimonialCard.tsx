import type { Testimonial } from "@/config/content";
import { Icon } from "@/components/Icon";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="card flex h-full flex-col">
      <div className="flex gap-0.5 text-amber-400" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon key={i} name="star" className="h-4 w-4" />
        ))}
      </div>
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-navy-700">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-navy-100 pt-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-700">
          {testimonial.initials}
        </span>
        <span>
          <span className="block text-sm font-semibold text-navy-900">{testimonial.name}</span>
          <span className="block text-xs text-navy-500">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
