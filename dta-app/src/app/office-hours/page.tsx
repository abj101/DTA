import type { Metadata } from "next";

import { OfficeHoursModule } from "@/components/office-hours/office-hours-module";
import { LandingSection } from "@/components/landing/section";
import { getOfficeHours } from "@/lib/office-hours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Office Hours",
  description:
    "Drop-in office hours for current Dublin Tutoring Association students. See the next window, time, and location.",
};

export default async function OfficeHoursPage() {
  const data = await getOfficeHours();

  return (
    <main className="flex flex-1 flex-col bg-dta-base">
      <LandingSection
        compact
        tone="base"
        className="[&>div]:pt-[clamp(2.25rem,6vw,3.75rem)] [&>div]:!pb-dta-lg"
      >
        <div className="space-y-dta-sm">
          <h1
            className="dta-rise font-heading text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-[-0.03em] text-dta-text-primary sm:text-[32px] sm:leading-[1.2]"
            style={{ animationDelay: "0ms" }}
          >
            Office Hours
          </h1>
          <p
            className="dta-rise mt-dta-md max-w-[58ch] text-base leading-[1.65] text-dta-text-secondary md:text-lg md:leading-relaxed"
            style={{ animationDelay: "110ms" }}
          >
            Drop-in support for current students.
          </p>
        </div>

        <div className="dta-rise mt-dta-xl" style={{ animationDelay: "230ms" }}>
          <OfficeHoursModule data={data} />
        </div>
      </LandingSection>
    </main>
  );
}
