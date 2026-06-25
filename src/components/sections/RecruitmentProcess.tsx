import { recruitmentProcess } from "@/config/content";
import { Icon, type IconName } from "@/components/Icon";
import { ApplyButton } from "@/components/apply/ApplyButton";

const stepIcons: IconName[] = [
  "upload",
  "search",
  "phone",
  "graduation",
  "chat",
  "trophy",
];

export function RecruitmentProcess() {
  return (
    <section id="recruitment-process" className="section bg-navy-50/60">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          {/* Sticky intro */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <span className="pill uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Recruitment Process
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-navy-900 sm:text-4xl">
                A clear, supportive hiring journey
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-navy-600 sm:text-lg">
                Here is what to expect after you apply. We keep you informed at
                every step along the way.
              </p>

              <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft">
                <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                  <Icon name="checkCircle" className="h-4 w-4 text-brand-600" />
                  Good to know
                </p>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  Only shortlisted candidates may be contacted, and the process
                  can vary by position.
                </p>
              </div>

              <ApplyButton label="Start your application" className="mt-6 w-full sm:w-auto" />
            </div>
          </div>

          {/* Timeline */}
          <div className="lg:col-span-8">
            <ol className="mt-2">
              {recruitmentProcess.map((step, i) => {
                const isLast = i === recruitmentProcess.length - 1;
                return (
                  <li key={step.title} className={`flex gap-5 sm:gap-6 ${isLast ? "" : "pb-6"}`}>
                    {/* Rail: numbered node + connector */}
                    <div className="flex flex-col items-center">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-base font-bold text-white shadow-glow">
                        {i + 1}
                      </span>
                      {!isLast ? (
                        <span
                          aria-hidden="true"
                          className="mt-2 w-0.5 flex-1 rounded-full bg-gradient-to-b from-brand-300 to-navy-100"
                        />
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="group mb-0 flex-1 rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card sm:p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-200 group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white">
                            <Icon name={stepIcons[i % stepIcons.length]} className="h-5 w-5" />
                          </span>
                          <h3 className="text-base font-semibold text-navy-900 sm:text-lg">
                            {step.title}
                          </h3>
                        </div>
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-navy-300">
                          Step {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-navy-600">
                        {step.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
