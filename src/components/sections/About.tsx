import { siteConfig } from "@/config/site";
import { SectionHeading } from "@/components/SectionHeading";
import { Reveal } from "@/components/Reveal";
import { Icon } from "@/components/Icon";

export function About() {
  return (
    <section id="about" className="section bg-white">
      <div className="container-page">
        <SectionHeading
          eyebrow="About Us"
          title="A customer-experience company built on great people"
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-5 text-center text-navy-600">
          <p className="leading-relaxed">{siteConfig.company.description}</p>
          <p className="leading-relaxed">{siteConfig.company.descriptionExtended}</p>
        </div>

        <Reveal className="mt-14">
          <h3 className="text-center text-xl font-semibold text-navy-900">Our Values</h3>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.company.values.map((value) => (
              <div key={value.title} className="card h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name="checkCircle" className="h-5 w-5" />
                </span>
                <h4 className="mt-4 text-base font-semibold text-navy-900">{value.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{value.description}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
