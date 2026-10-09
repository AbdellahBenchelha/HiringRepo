import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { Stats } from "@/components/sections/Stats";
import { Values } from "@/components/sections/Values";
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

      <Values />

      <Stats />
      <CtaBand />
    </>
  );
}
