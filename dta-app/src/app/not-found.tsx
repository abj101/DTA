import Link from "next/link";

import { sectionLabelClassName } from "@/components/landing/section";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <section
        className="relative flex min-h-[min(70vh,520px)] flex-1 overflow-hidden border-b border-dta-border bg-dta-base"
        aria-labelledby="not-found-heading"
      >
        <div
          className="pointer-events-none absolute -right-[18%] top-[-30%] h-[min(60vw,440px)] w-[min(60vw,440px)] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,20,20,0.04)_0%,transparent_65%)] motion-reduce:hidden"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-dta-md py-dta-xl md:px-dta-lg md:py-section">
          <div className="max-w-[72ch]">
            <p className={sectionLabelClassName}>Page not found</p>
            <h1
              id="not-found-heading"
              className="mt-dta-md font-heading text-[clamp(1.75rem,5vw,2.75rem)] font-semibold tracking-[-0.03em] text-dta-text-primary sm:text-[32px] sm:leading-[1.2]"
            >
              We couldn&apos;t find that page
            </h1>
            <p className="mt-dta-lg max-w-[65ch] text-base leading-[1.65] text-dta-text-secondary md:text-lg md:leading-relaxed">
              The link may be wrong or the page may have moved. Go home, or get in touch from Contact.
            </p>
            <div className="mt-dta-xl flex flex-col gap-dta-sm sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="rounded-dta-sm px-[22px] py-6 text-base font-semibold shadow-none hover:bg-primary/90 sm:h-12"
                render={<Link href="/" />}
                nativeButton={false}
              >
                Back to Home →
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-dta-sm border-dta-border bg-transparent px-[22px] py-6 text-base font-semibold text-dta-text-primary hover:bg-dta-surface hover:text-dta-text-primary sm:h-12"
                render={<Link href="/contact" />}
                nativeButton={false}
              >
                Contact
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-dta-sm px-[22px] text-base font-medium text-dta-text-secondary hover:bg-transparent hover:text-dta-text-primary sm:h-12"
                render={<Link href="/about" />}
                nativeButton={false}
              >
                About us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
