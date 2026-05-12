import { sectionLabelClassName } from "@/components/landing/section";

export function AboutHero() {
  return (
    <section
      className="relative overflow-hidden bg-dta-base"
      aria-labelledby="about-hero-heading"
    >
      <div
        className="pointer-events-none absolute left-[-25%] top-[-40%] h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-[radial-gradient(circle_at_center,rgba(114,214,255,0.1)_0%,transparent_68%)] motion-reduce:hidden"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-dta-md pb-dta-md pt-[clamp(2.25rem,7vw,3.75rem)] md:px-dta-lg md:pb-dta-lg">
        <div className="dta-rise mx-auto max-w-[min(100%,52rem)]">
          <p className={sectionLabelClassName}>Dublin Tutoring Association</p>
          <h1
            id="about-hero-heading"
            className="mt-dta-md font-heading text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-[-0.03em] text-dta-text-primary sm:text-[32px] sm:leading-[1.2]"
          >
            Our Story
          </h1>
          <p className="mt-dta-lg max-w-[65ch] text-base leading-[1.65] text-dta-text-secondary md:text-lg md:leading-relaxed">
            We&apos;re Ayush Bandopadhyay and Ayush Bakhandi - two recent UC
            graduates who grew up in the Tri-Valley, went through the same high
            school experience your student is navigating right now.
            <br />
            <br />
            Throughout college, we kept hearing from families in our community:
            Could we help with AP Calculus? Review a personal statement? Talk
            through junior-year classes? What started as informal mentoring
            quickly became something we were doing more and more. After enough
            families reached out, we realized making our experiences and
            knowledge available to more students was the next step. DTA is our
            way of giving back to the community we grew up in.
          </p>
        </div>
      </div>
    </section>
  );
}
