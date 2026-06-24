import { candidateRequirements } from "@/config/content";
import { SectionHeading } from "@/components/SectionHeading";
import { Icon } from "@/components/Icon";

export function CandidateRequirements() {
  return (
    <section id="who-we-are-looking-for" className="section bg-navy-900 text-white">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-brand-300">Who We Are Looking For</p>
          <h2 className="mt-2 text-3xl text-white sm:text-4xl">
            Motivated people ready to deliver great service
          </h2>
          <p className="mt-4 text-navy-200">
            Applications are welcome from both experienced candidates and motivated beginners,
            depending on the position. If you are friendly, reliable, and eager to learn, we would
            love to hear from you.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-1">
          {candidateRequirements.map((req) => (
            <li
              key={req}
              className="flex items-start gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-inset ring-white/10"
            >
              <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
              <span className="text-sm text-navy-100">{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
