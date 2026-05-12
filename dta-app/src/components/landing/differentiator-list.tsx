import { Separator } from "@/components/ui/separator";

import {
  LandingSection,
  SectionHeadline,
  sectionLabelClassName,
} from "./section";

const ROWS = [
  {
    lead: "Real",
    rest: " AP & College Application Experience",
  },
  {
    lead: "Free Office Hours",
    rest: " for Additional Support",
  },
  {
    lead: "10+ Years",
    rest: " of Tutoring across the Bay Area",
  },
  {
    lead: "Personalized Plans",
    rest: " for College Readiness",
  },
  {
    lead: "Reasonable Pricing",
    rest: " without Compromising Quality",
  },
] as const;

export function DifferentiatorList() {
  return (
    <LandingSection tone="base" compact>
      <h2 className={sectionLabelClassName}>What sets us apart?</h2>
      <SectionHeadline
        as="h3"
        className="mt-1 max-w-[56ch] text-[26px] sm:text-[28px]"
      >
        We&apos;ve been exactly where you are.
      </SectionHeadline>
      <ul className="mt-dta-md space-y-0" role="list">
        {ROWS.map((row, i) => (
          <li key={row.lead}>
            {i > 0 ? (
              <Separator className="my-dta-md bg-dta-border" />
            ) : null}
            <p className="text-[16px] font-medium leading-snug text-dta-text-primary md:text-[17px] md:leading-relaxed">
              <span className="font-semibold text-dta-text-primary">
                {row.lead}
              </span>
              <span className="text-dta-text-secondary">{row.rest}</span>
            </p>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
