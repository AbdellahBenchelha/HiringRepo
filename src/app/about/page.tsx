import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/Icon";
import { Stats } from "@/components/sections/Stats";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata = buildMetadata({
  title: "About Us",
  description:
    "Learn about WorkRoute — a customer-experience outsourcing company helping international brands deliver exceptional service.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About Us"
        title="A customer-experience company built on great people"
        description="We help international brands build stronger relationships with their customers — and we help our people build rewarding careers."
      />

      <section className="section bg-white">
        <div className="container-page max-w-3xl space-y-5 text-navy-600">
          <p className="leading-relaxed">{siteConfig.company.description}</p>
          <p className="leading-relaxed">{siteConfig.company.descriptionExtended}</p>
        </div>
      </section>

      <section className="bg-navy-50/60 py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-center text-3xl">Our Values</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {siteConfig.company.values.map((value) => (
              <div key={value.title} className="card h-full">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name="checkCircle" className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Stats />
      <CtaBand />
    </>
  );
}
