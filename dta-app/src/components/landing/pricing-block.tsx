import Link from "next/link";
import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_CTA_LAYOUT } from "@/lib/booking-cta";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

import { LandingSection, sectionLabelClassName } from "./section";

export function PricingBlock() {
  return (
    <LandingSection tone="base" compact className="pb-dta-lg md:pb-dta-xl">
      <div className="dta-rise" style={{ animationDelay: "150ms" }}>
        <h2 className={sectionLabelClassName}>{"Pricing & next step"}</h2>
        {/* Inverse band: the page's terminal moment (DESIGN.md flyer-footer pattern). */}
        <Card className="mt-dta-md overflow-hidden rounded-dta-lg border-0 bg-dta-inverse-bg shadow-none ring-0">
          <CardContent className="p-dta-lg md:p-dta-xl">
            <div className="flex flex-col gap-dta-md md:flex-row md:items-center md:justify-between md:gap-dta-lg">
              <div className="flex min-w-0 flex-col gap-dta-sm">
                <p
                  id="pricing-block-summary"
                  className="font-heading text-[clamp(1.35rem,3.2vw,1.7rem)] font-semibold leading-[1.15] tracking-[-0.025em] text-dta-inverse-text"
                >
                  Pricing Varies for Grade Level & Subject
                </p>
                <p className="font-mono text-[11px] font-medium uppercase leading-[1.5] tracking-[0.08em] text-dta-inverse-muted md:text-xs">
                  {"1-hour sessions · 1-on-1 · In-person & Online"}
                </p>
              </div>
              <Button
                size="lg"
                className={cn(
                  BOOKING_CTA_LAYOUT,
                  "w-full shrink-0 rounded-dta-sm border border-transparent bg-dta-base text-dta-text-primary hover:bg-dta-base/88 hover:text-dta-text-primary [a]:hover:bg-dta-base/88 [a]:hover:text-dta-text-primary md:w-auto",
                  "justify-center gap-0 px-4 text-[15px] sm:px-6 sm:text-[1rem]",
                )}
                render={<Link href="/contact" />}
                nativeButton={false}
                aria-describedby="pricing-block-summary"
              >
                <span className="inline-flex items-center justify-center gap-2 sm:gap-2.5">
                  <Calendar className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                  <span className="leading-none whitespace-nowrap">
                    Book Free Consultation
                  </span>
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </LandingSection>
  );
}
