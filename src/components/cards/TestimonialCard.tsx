import type { Testimonial } from "@/config/content";
import { Icon } from "@/components/Icon";

const avatarGradients = [
  "from-brand-400 to-brand-600",
  "from-indigo-400 to-indigo-600",
  "from-rose-400 to-rose-600",
  "from-amber-400 to-orange-500",
  "from-sky-400 to-sky-600",
];

function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label="Rated 5 out of 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" className="h-4 w-4" aria-hidden="true" />
      ))}
    </div>
  );
}

function Avatar({
  initials,
  index,
  className = "",
}: {
  initials: string;
  index: number;
  className?: string;
}) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-soft ${
        avatarGradients[index % avatarGradients.length]
      } ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function TestimonialCard({
  testimonial,
  index = 0,
  featured = false,
}: {
  testimonial: Testimonial;
  index?: number;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <figure className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-brand-900 p-8 text-white shadow-card sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-brand-600/20 blur-3xl" />
        </div>
        <span
          aria-hidden="true"
          className="absolute right-8 top-4 select-none font-serif text-8xl leading-none text-white/10"
        >
          &rdquo;
        </span>

        <div className="relative flex flex-1 flex-col">
          <Stars className="text-amber-400" />
          <blockquote className="mt-5 flex-1 text-xl font-medium leading-relaxed sm:text-2xl">
            {testimonial.quote}
          </blockquote>
          <figcaption className="mt-8 flex items-center gap-4 border-t border-white/10 pt-6">
            <Avatar initials={testimonial.initials} index={index} className="h-12 w-12" />
            <span>
              <span className="block font-semibold text-white">{testimonial.name}</span>
              <span className="block text-sm text-brand-200">{testimonial.role}</span>
            </span>
          </figcaption>
        </div>
      </figure>
    );
  }

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-navy-100 bg-white p-6 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
      <Stars className="text-amber-400" />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-navy-700">
        {testimonial.quote}
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-navy-100 pt-4">
        <Avatar initials={testimonial.initials} index={index} />
        <span>
          <span className="block text-sm font-semibold text-navy-900">{testimonial.name}</span>
          <span className="block text-xs text-navy-500">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
