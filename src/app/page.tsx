import { Hero } from "@/components/sections/Hero";
import { Stats } from "@/components/sections/Stats";
import { Clients } from "@/components/sections/Clients";
import { About } from "@/components/sections/About";
import { WhyJoinUs } from "@/components/sections/WhyJoinUs";
import { OpenPositions } from "@/components/sections/OpenPositions";
import { CandidateRequirements } from "@/components/sections/CandidateRequirements";
import { RecruitmentProcess } from "@/components/sections/RecruitmentProcess";
import { Testimonials } from "@/components/sections/Testimonials";
import { Faq } from "@/components/sections/Faq";
import { ContactSection } from "@/components/sections/ContactSection";
import { CtaBand } from "@/components/sections/CtaBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <Clients />
      <About />
      <WhyJoinUs />
      <OpenPositions />
      <CandidateRequirements />
      <RecruitmentProcess />
      <Testimonials />
      <Faq />
      <CtaBand />
      <ContactSection />
    </>
  );
}
