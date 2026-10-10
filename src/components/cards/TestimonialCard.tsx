import type { Testimonial } from "@/config/content";
import { Icon } from "@/components/Icon";

const avatarGradients = [
  "from-brand-400 to-brand-600",
  "from-indigo-400 to-indigo-600",
  "from-rose-400 to-rose-600",
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-sky-600",
];

const STAR = "M12 2l2.9 6.3 6.9.7-5.1 4.7 1.4 6.8L12 17.8 5.9 20.5l1.4-6.8L2.2 9l6.9-.7L12 2Z";

/** Five stars as one drawing rather than five, since every card carries them. */
function Stars() {
  return (
    <svg
      viewBox="0 0 136 24"
      width="102"
      height="18"
      fill="currentColor"
      className="text-brand-500"
      role="img"
      aria-label="Rated 5 out of 5"
    >
      {[0, 28, 56, 84, 112].map((x) => (
        <path key={x} d={STAR} transform={`translate(${x} 0)`} />
      ))}
    </svg>
  );
}

/**
 * One team member's words, as in the approved design: the quote mark beside
 * the quote, five stars, and who said it. Initials rather than a photo — a
 * face beside a quote is a claim that this is that person.
 */
export function TestimonialCard({ testimonial, index = 0 }: { testimonial: Testimonial; index?: number }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(15,16,53,0.04),0_18px_44px_-24px_rgba(15,16,53,0.2)] ring-1 ring-cream-300/50 sm:p-6">
      <div className="flex flex-1 gap-3.5">
        <Icon name="quote" className="mt-0.5 h-7 w-7 shrink-0 text-brand-200" />
        <div className="flex min-w-0 flex-1 flex-col">
          <blockquote className="flex-1 text-[15px] leading-relaxed text-navy-700">
            &ldquo;{testimonial.quote}&rdquo;
          </blockquote>
          <div className="mt-3">
            <Stars />
          </div>
        </div>
      </div>
      <figcaption className="mt-5 flex items-center gap-3.5">
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-soft ring-2 ring-white ${
            avatarGradients[index % avatarGradients.length]
          }`}
        >
          {testimonial.initials}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-base font-extrabold text-navy-900">
            {testimonial.name}
          </span>
          <span className="block truncate text-sm text-navy-500">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
