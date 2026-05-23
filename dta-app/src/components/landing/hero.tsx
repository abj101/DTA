import Link from "next/link";
import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BOOKING_CTA_LAYOUT } from "@/lib/booking-cta";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section
      className="hero relative flex items-center bg-dta-base"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-dta-md md:px-dta-lg">
        <div className="mx-auto max-w-[min(100%,52rem)] py-dta-lg md:py-[clamp(2rem,5vw,3rem)]">
          <h1
            id="hero-heading"
            className="text-[clamp(2.35rem,5.8vw,3.85rem)] font-semibold leading-[1.08] tracking-[-0.045em]"
          >
            <span
              className="dta-rise block font-sans text-dta-text-primary"
              style={{ animationDelay: "0ms" }}
            >
              Private tutoring,
            </span>
            <span
              className="dta-rise mt-1 block font-[family-name:var(--font-libre-baskerville)] font-normal italic leading-[1.12] tracking-[-0.02em] text-dta-text-secondary"
              style={{ animationDelay: "110ms" }}
            >
              shaped around your student&apos;s goals.
            </span>
          </h1>

          <p
            className="dta-rise mt-dta-xl max-w-[58ch] text-[17px] leading-relaxed text-dta-text-secondary md:text-[18px] md:leading-[1.6]"
            style={{ animationDelay: "230ms" }}
          >
            Recent college graduates who know AP coursework and admissions firsthand.
            More than just another class, we provide personalized sessions that help
            students realize their potential and grow beyond the classroom.
          </p>

          <div
            className="dta-rise mt-dta-xl flex flex-wrap items-center gap-x-dta-lg gap-y-dta-md"
            style={{ animationDelay: "340ms" }}
          >
            <Button
              size="lg"
              className={cn(
                BOOKING_CTA_LAYOUT,
                "rounded-dta-sm hover:bg-primary/90",
                "justify-center gap-0 px-4 text-[15px] sm:px-6 sm:text-[1rem]",
              )}
              render={<Link href="/contact" />}
              nativeButton={false}
            >
              <span className="inline-flex items-center justify-center gap-2 sm:gap-2.5">
                <Calendar className="size-3.5 shrink-0 sm:size-4" aria-hidden />
                <span className="leading-none whitespace-nowrap">
                  Book Free Consultation
                </span>
              </span>
            </Button>
            <Link
              href="/about"
              className="text-[15px] font-medium text-dta-text-secondary underline decoration-dta-border underline-offset-[5px] transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary"
            >
              <span>About us</span>
              <span aria-hidden className="whitespace-nowrap">
                {" "}
                →
              </span>
            </Link>
          </div>

          <div
            className="dta-rise mt-dta-xl font-mono text-sm font-medium tracking-[0.05em] text-dta-text-primary md:text-[15px]"
            style={{ animationDelay: "450ms" }}
          >
            {
              "Tri-Valley · Grades 6–12 · STEM & English · AP · Essays · In-person & online"
            }
          </div>
        </div>
      </div>
    </section>
  );
}
