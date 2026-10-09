import type { Testimonial } from "@/config/content";
import { Icon } from "@/components/Icon";

const avatarGradients = [
  "from-brand-400 to-brand-600",
  "from-indigo-400 to-indigo-600",
  "from-rose-400 to-rose-600",
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-sky-600",
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-brand-500" role="img" aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" className="h-4 w-4" />
      ))}
    </div>
  );
}

/**
 * One team member's words, as in the approved design: the quote mark, the
 * quote, five stars, and who said it. Initials rather than a photo — a face
 * beside a quote is a claim that this is that person.
 */
export function TestimonialCard({ testimonial, index = 0 }: { testimonial: Testimonial; index?: number }) {
  return (
    <figure className="card-soft flex h-full flex-col p-5 sm:p-6">
      <Icon name="quote" className="h-7 w-7 text-brand-300" />
      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-navy-700">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <div className="mt-4">
        <Stars />
      </div>
      <figcaption className="mt-4 flex items-center gap-3 border-t border-cream-300 pt-4">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-soft ${
            avatarGradients[index % avatarGradients.length]
          }`}
        >
          {testimonial.initials}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[15px] font-bold text-navy-900">
            {testimonial.name}
          </span>
          <span className="block truncate text-[13px] text-navy-500">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
