"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from "@/lib/contact";

const CONTACT_LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm text-dta-text-secondary transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary";
const FOOTER_NAV_LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm text-dta-text-secondary transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary";
const FOOTER_SECTION_TITLE_CLASS =
  "font-mono text-[11px] uppercase tracking-[0.14em] text-dta-text-muted";

export function SiteFooter() {
  const pathname = usePathname();

  return (
    <footer key={pathname} className="mt-auto bg-dta-base">
      <div className="mx-auto max-w-6xl px-dta-md md:px-dta-lg">
        <div className="mx-auto max-w-[min(100%,52rem)]">
          <div
            className="dta-rise relative py-[clamp(2.25rem,4vw,4rem)] before:absolute before:left-1/2 before:top-0 before:h-px before:w-[calc(100vw-(2*clamp(0.75rem,3vw,2.8125rem)))] before:max-w-none before:-translate-x-1/2 before:bg-dta-border before:content-['']"
            style={{ animationDelay: "150ms" }}
          >
            <div className="grid gap-y-dta-xl md:grid-cols-[minmax(0,1.65fr)_minmax(0,auto)] md:items-start md:gap-x-[clamp(2rem,5vw,4.5rem)]">
              <div className="max-w-[28rem] space-y-dta-md">
                <p className="font-heading text-base font-semibold tracking-tight text-dta-text-primary">
                  Dublin Tutoring Association
                </p>
                <p className="max-w-[34ch] text-sm leading-7 text-dta-text-secondary">
                  Personalized tutoring for Tri-Valley students.
                </p>
              </div>

              <div className="grid gap-y-dta-lg sm:grid-cols-2 sm:gap-x-dta-xl md:justify-self-end">
                <div className="space-y-dta-sm">
                  <h2 className={FOOTER_SECTION_TITLE_CLASS}>Quick links</h2>
                  <div className="flex flex-col gap-1">
                    <Link href="/" className={FOOTER_NAV_LINK_CLASS}>
                      Home
                    </Link>
                    <Link href="/about" className={FOOTER_NAV_LINK_CLASS}>
                      About
                    </Link>
                    <Link href="/contact" className={FOOTER_NAV_LINK_CLASS}>
                      Contact
                    </Link>
                  </div>
                </div>

                <div className="space-y-dta-sm">
                  <h2 className={FOOTER_SECTION_TITLE_CLASS}>Get in touch</h2>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={CONTACT_EMAIL_HREF}
                      className={CONTACT_LINK_CLASS}
                      aria-label={`Email ${CONTACT_EMAIL}`}
                    >
                      {CONTACT_EMAIL}
                    </Link>
                    <Link
                      href={CONTACT_PHONE_HREF}
                      className={CONTACT_LINK_CLASS}
                      aria-label={`Call ${CONTACT_PHONE_DISPLAY}`}
                    >
                      {CONTACT_PHONE_DISPLAY}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-[clamp(1.75rem,3vw,2.5rem)] border-t border-dta-border pt-dta-md">
              <p className="text-xs text-dta-text-muted">© DTA</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
