import { buildMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { WhyJoinUs } from "@/components/sections/WhyJoinUs";
import { OpenPositions } from "@/components/sections/OpenPositions";
import { CandidateRequirements } from "@/components/sections/CandidateRequirements";
import { RecruitmentProcess } from "@/components/sections/RecruitmentProcess";
import { Testimonials } from "@/components/sections/Testimonials";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata = buildMetadata({
  title: "Careers",
  description:
    "Discover why people love building their careers at WorkRoute — benefits, open positions, our hiring process, and more.",
  path: "/careers",
});

export default function CareersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Careers"
        title="Grow your career with WorkRoute"
        description="From paid professional training to internal promotions, we give you the tools and support to succeed."
      />
      <WhyJoinUs />
      <OpenPositions />
      <CandidateRequirements />
      <RecruitmentProcess />
      <Testimonials />
      <CtaBand />
    </>
  );
}
