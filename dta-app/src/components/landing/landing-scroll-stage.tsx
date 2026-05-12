import { DifferentiatorList } from "@/components/landing/differentiator-list";
import { Hero } from "@/components/landing/hero";
import { PricingBlock } from "@/components/landing/pricing-block";
import { ProblemCards } from "@/components/landing/problem-cards";

function SectionDivider() {
  return (
    <div className="w-full">
      <hr className="divider relative left-1/2 w-[calc(100vw-(2*clamp(1rem,3.5vw,3.125rem)))] max-w-none -translate-x-1/2 border-0 border-t border-dta-border" />
    </div>
  );
}

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
