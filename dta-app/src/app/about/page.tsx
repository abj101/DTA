import type { Metadata } from "next";

import { AboutHero } from "@/components/about/about-hero";
import { ApproachList } from "@/components/about/approach-list";
import { FounderCards } from "@/components/about/founder-cards";
import { LandingCTABanner } from "@/components/landing/cta-banner";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet the Dublin Tutoring Association founders and learn how we work with Tri-Valley families.",
};

function SectionDivider() {
  return (
    <div className="w-full">
      <hr className="divider relative left-1/2 w-[calc(100vw-(2*clamp(1rem,3.5vw,3.125rem)))] max-w-none -translate-x-1/2 border-0 border-t border-dta-border" />
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="flex flex-1 flex-col bg-dta-base">
      <AboutHero />
      <div className="my-dta-lg md:my-dta-xl">
        <SectionDivider />
      </div>
      <FounderCards />
      <div className="my-dta-lg md:my-dta-xl">
        <SectionDivider />
      </div>
      <ApproachList />
      <div className="my-dta-lg md:my-dta-xl">
        <SectionDivider />
      </div>
      <LandingCTABanner variant="about" />
    </main>
  );
}
