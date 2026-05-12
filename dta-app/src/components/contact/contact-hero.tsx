import { sectionLabelClassName } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ContactHero() {
  return (
    <section
      className="relative overflow-hidden bg-dta-base"
      aria-labelledby="contact-hero-heading"
    >
      <div className="relative mx-auto max-w-6xl px-dta-md pb-[clamp(2rem,6vw,3.25rem)] pt-[clamp(2.25rem,7vw,3.75rem)] md:px-dta-lg">
        <div className="dta-rise mx-auto max-w-[min(100%,48rem)]">
          <p className={sectionLabelClassName}>Dublin Tutoring Association</p>
          <h1
            id="contact-hero-heading"
            className="mt-dta-md font-heading text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-[-0.03em] text-dta-text-primary sm:text-[32px] sm:leading-[1.2]"
          >
            Start with a free consultation
          </h1>
          <p className="mt-dta-lg max-w-[65ch] text-base leading-[1.65] text-dta-text-secondary md:text-lg md:leading-relaxed">
            Share your student&apos;s grade and goals, then pick a time that works.
          </p>
          <div className="mt-dta-xl">
            <a
              href="#book"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "rounded-dta-md px-dta-lg text-sm font-medium",
              )}
            >
              Book Consultation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
