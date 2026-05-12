import { Separator } from "@/components/ui/separator";

import {
  LandingSection,
  sectionLabelClassName,
} from "@/components/landing/section";

const ROWS = [
  {
    step: "01",
    title: "Book a free 30-minute consultation",
    detail: "We learn about your student and share our honest recommendation.",
  },
  {
    step: "02",
    title: "Get matched to the right tutor",
    detail:
      "We pair your student with the tutor who fits their subject and goals best.",
  },
  {
    step: "03",
    title: "Start 1:1 sessions built around your student",
    detail: "Every session covers what your student is actually working on.",
  },
  {
    step: "04",
    title: "Drop into office hours anytime",
    detail:
      "Weekly drop-in for quick questions and getting unstuck. No booking needed.",
  },
] as const;

export function ApproachList() {
  return (
    <LandingSection compact>
      <div className="dta-rise" style={{ animationDelay: "150ms" }}>
        <h2 className={sectionLabelClassName}>How we work</h2>
        <ul className="mt-dta-xl space-y-0" role="list">
          {ROWS.map((row, i) => (
            <li key={row.step}>
              {i > 0 ? <Separator className="my-dta-lg bg-dta-border" /> : null}
              <div className="flex items-center gap-dta-sm sm:gap-dta-md md:gap-dta-lg">
                <p className="w-7 shrink-0 font-mono text-[11px] font-medium tabular-nums leading-none text-dta-text-muted md:w-10 md:text-xs">
                  {row.step}
                </p>
                <div className="min-w-0 space-y-dta-sm">
                  <p className="text-[17px] font-medium leading-snug text-dta-text-primary md:text-[18px] md:leading-relaxed">
                    {row.title}
                  </p>
                  <p className="text-[14px] leading-relaxed text-dta-text-muted md:text-[15px]">
                    {row.detail}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </LandingSection>
  );
}
