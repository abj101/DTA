import { Separator } from "@/components/ui/separator";

import { LandingSection, sectionLabelClassName } from "./section";

const ITEMS = [
  {
    title: "Math: Algebra 1 - Calculus BC",
  },
  {
    title: "Science: Biology, Chemistry, Physics, & AP",
  },
  {
    title: "Essay Review, Medicine and Computer Science Track Guidance",
  },
] as const;

export function ProblemCards() {
  return (
    <LandingSection id="courses-covered" tone="base" compact>
      <div className="dta-rise" style={{ animationDelay: "150ms" }}>
        <h2 className={sectionLabelClassName}>Courses Covered</h2>
        <ol className="mt-dta-md list-none space-y-0 p-0">
          {ITEMS.map((item, i) => (
            <li key={item.title}>
              {i > 0 ? (
                <Separator className="my-dta-md bg-dta-border" />
              ) : null}
              <div className="flex items-center gap-dta-sm sm:gap-dta-md md:gap-dta-lg">
                <p className="w-7 shrink-0 font-mono text-[11px] font-medium tabular-nums leading-none text-dta-text-muted md:w-10 md:text-xs">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <div className="min-w-0">
                  <h3 className="font-heading text-[16px] leading-tight font-semibold tracking-[-0.02em] text-dta-text-primary sm:text-[17px]">
                    {item.title}
                  </h3>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </LandingSection>
  );
}
