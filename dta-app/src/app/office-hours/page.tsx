import { Suspense } from "react";
import type { Metadata } from "next";
import { after } from "next/server";

import { OfficeHoursModule } from "@/components/office-hours/office-hours-module";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingSection } from "@/components/landing/section";
import { getOfficeHours } from "@/lib/office-hours";
import { notifyOfficeHoursChanges } from "@/lib/office-hours-update";
import { isStaticExport } from "@/lib/static-export";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Office Hours",
  description:
    "Drop-in office hours for current Dublin Tutoring Association students. See the next window, time, and location.",
};

async function OfficeHoursSchedule() {
  const data = await getOfficeHours();
  if (!isStaticExport && data.status === "ok") {
    after(async () => {
      try {
        await notifyOfficeHoursChanges(data);
      } catch (error) {
        console.error("[office-hours] update check failed", error);
      }
    });
  }

  return <OfficeHoursModule data={data} />;
}

export default function OfficeHoursPage() {
  return (
    <main className="flex flex-1 flex-col bg-dta-base">
      <LandingSection
        compact
        tone="base"
        className="[&>div]:pt-[clamp(3rem,7vw,5rem)] [&>div]:!pb-[clamp(4rem,8vw,6rem)]"
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
          <Suspense fallback={
            <div role="status" aria-label="Loading office hours" className="border-t border-dta-border pt-dta-xl">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(10.75rem,max-content)] gap-dta-md" aria-hidden="true">
                <div className="space-y-dta-md">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-48 max-w-full" />
                  <Skeleton className="h-6 w-36 max-w-full" />
                  <Skeleton className="h-5 w-56 max-w-full" />
                </div>
                <div className="space-y-dta-md">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-36 max-w-full" />
                  <Skeleton className="h-8 w-36 max-w-full" />
                  <Skeleton className="h-10 w-full rounded-full" />
                </div>
              </div>
            </div>
          }>
            <OfficeHoursSchedule />
          </Suspense>
        </div>
      </LandingSection>
    </main>
  );
}

