import { DifferentiatorList } from "@/components/landing/differentiator-list";
import { Hero } from "@/components/landing/hero";
import { PricingBlock } from "@/components/landing/pricing-block";
import { ProblemCards } from "@/components/landing/problem-cards";
import { SectionDivider } from "@/components/landing/section-divider";

export function LandingScrollStage() {
  return (
    <>
      <Hero />
      <ProblemCards />
      <div className="my-dta-lg md:my-dta-xl">
        <SectionDivider />
      </div>
      <DifferentiatorList />
      <div className="my-dta-lg md:my-dta-xl">
        <SectionDivider />
      </div>
      <PricingBlock />
    </>
  );
}
