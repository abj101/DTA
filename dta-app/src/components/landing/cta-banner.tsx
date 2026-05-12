import Link from "next/link";
import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_CTA_LAYOUT } from "@/lib/booking-cta";
import { cn } from "@/lib/utils";

import { LandingSection } from "./section";

type LandingCTABannerVariant = "home" | "about";

const VARIANT_COPY: Record<
  LandingCTABannerVariant,
  { headline: string; sub?: string; cta: string }
> = {
  home: {
    headline: "Ready to get started?",
    sub: "Book your free 30-minute consultation. No commitment required.",
    cta: "Schedule Now →",
  },
  about: {
    headline: "Ready to take the first step?",
    cta: "Book Free Consultation",
  },
};

type LandingCTABannerProps = {
  variant?: LandingCTABannerVariant;
};

export function LandingCTABanner({ variant = "home" }: LandingCTABannerProps) {
  const copy = VARIANT_COPY[variant];
  const isAboutVariant = variant === "about";

  return (
    <LandingSection
      tone={isAboutVariant ? "base" : "raised"}
      compact={isAboutVariant}
      className={cn(
        !isAboutVariant && "border-t border-dta-border",
        !isAboutVariant && "[&>div]:pb-[clamp(3rem,8vw,4rem)]",
      )}
    >
      <div
        className="dta-rise rounded-dta-lg bg-dta-inverse-bg px-dta-md py-[clamp(2rem,5vw,3rem)] text-dta-inverse-text sm:px-dta-lg md:px-dta-xl md:py-[clamp(2.25rem,5vw,3.25rem)]"
        style={{ animationDelay: "150ms" }}
      >
        <div className="flex flex-col gap-dta-xl md:flex-row md:items-center md:justify-between md:gap-x-dta-xl">
          <div className="max-w-xl">
            <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] text-dta-inverse-text">
              {copy.headline}
            </h2>
            {copy.sub ? (
              <p className="mt-dta-sm max-w-[52ch] text-base leading-[1.65] text-dta-inverse-muted">
                {copy.sub}
              </p>
            ) : null}
          </div>
          <Button
            size="lg"
            className={cn(
              BOOKING_CTA_LAYOUT,
              isAboutVariant
                ? "w-full shrink-0 rounded-dta-sm border border-transparent bg-dta-base text-dta-text-primary hover:bg-dta-base/88 hover:text-dta-text-primary [a]:hover:bg-dta-base/88 [a]:hover:text-dta-text-primary md:w-auto justify-center gap-0 px-4 text-[15px] sm:px-6 sm:text-[1rem]"
                : "shrink-0 rounded-dta-sm border-0 bg-dta-inverse-text text-dta-inverse-bg hover:bg-dta-inverse-muted hover:text-dta-inverse-bg",
            )}
            render={<Link href="/contact" />}
            nativeButton={false}
            aria-describedby={isAboutVariant ? "about-cta-summary" : undefined}
          >
            {isAboutVariant ? (
              <span className="inline-flex items-center justify-center gap-2 sm:gap-2.5">
                <Calendar className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span className="leading-none whitespace-nowrap">{copy.cta}</span>
              </span>
            ) : (
              <>
                <span>{copy.cta.replace(/\s*→\s*$/, "")}</span>
                <span aria-hidden className="whitespace-nowrap">
                  {" "}
                  →
                </span>
              </>
            )}
          </Button>
        </div>
        {isAboutVariant ? (
          <p id="about-cta-summary" className="sr-only">
            Starting at $45 per session, 1-hour one-on-one tutoring in person or online.
          </p>
        ) : null}
      </div>
    </LandingSection>
  );
}
