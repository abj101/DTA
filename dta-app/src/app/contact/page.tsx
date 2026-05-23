import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { AppointmentPicker } from "@/components/contact/appointment-picker";
// import { MessageForm } from "@/components/contact/message-form";
import { LandingSection, sectionLabelClassName } from "@/components/landing/section";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from "@/lib/contact";

const CONTACT_LINK_CLASS =
  "inline-flex items-center gap-2 py-1 text-[15px] leading-normal text-dta-text-secondary transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary md:text-base";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Book a free consultation or message Dublin Tutoring Association for grades 6–12 tutoring and college prep in the Tri-Valley.",
};

// function ContactDivider() {
//   return (
//     <div className="w-full">
//       <hr className="relative left-1/2 w-[calc(100vw-(2*clamp(1rem,3.5vw,3.125rem)))] max-w-none -translate-x-1/2 border-0 border-t border-dta-border" />
//     </div>
//   );
// }

export default function ContactPage() {
  return (
    <main className="flex flex-col bg-dta-base">
      <LandingSection
        compact
        tone="base"
        id="book"
        className="[&>div]:pt-[clamp(2.25rem,6vw,3.75rem)] [&>div]:!pb-dta-lg"
      >
        <div className="space-y-dta-sm">
          <h2
            className={`${sectionLabelClassName} dta-rise`}
            style={{ animationDelay: "0ms" }}
          >
            Book Free Consultation
          </h2>
          <h3
            className="dta-rise max-w-[65ch] text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-dta-text-primary"
            style={{ animationDelay: "110ms" }}
          >
            Let&apos;s build a plan for your student
          </h3>
        </div>

        <div
          className="dta-rise mt-dta-xl border-t border-dta-border pt-dta-lg"
          style={{ animationDelay: "230ms" }}
        >
          <AppointmentPicker />
        </div>

        <div
          className="dta-rise mt-dta-xl border-t border-dta-border pt-dta-lg"
          style={{ animationDelay: "340ms" }}
        >
          <div className="space-y-dta-sm">
            <p className={sectionLabelClassName}>What to expect</p>
            <p className="max-w-[58ch] font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
              30 minutes. Free. No commitment.
            </p>
          </div>
          <p className="mt-dta-md max-w-[62ch] text-[15px] leading-[1.7] text-dta-text-secondary md:text-base">
            We&apos;ll ask about your student&apos;s courses, goals, and
            what&apos;s been hard. By the end of the call, we&apos;ll tell you
            honestly whether we&apos;re the right fit. If we&apos;re not, we&apos;ll
            say so.
          </p>
        </div>

        <div
          className="dta-rise mt-dta-xl border-t border-dta-border pt-dta-lg"
          style={{ animationDelay: "450ms" }}
        >
          <div className="space-y-dta-sm">
            <p className={sectionLabelClassName}>Get In Touch</p>
            <p className="max-w-[58ch] font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
              We&apos;re easy to reach
            </p>
          </div>
          <div className="mt-dta-sm flex flex-wrap items-center gap-x-dta-lg gap-y-1">
            <Link
              href={CONTACT_EMAIL_HREF}
              className={CONTACT_LINK_CLASS}
              aria-label={`Email ${CONTACT_EMAIL}`}
            >
              <Mail className="size-[1em] shrink-0" strokeWidth={2} aria-hidden />
              {CONTACT_EMAIL}
            </Link>
            <Link
              href={CONTACT_PHONE_HREF}
              className={CONTACT_LINK_CLASS}
              aria-label={`Call ${CONTACT_PHONE_DISPLAY}`}
            >
              <Phone className="size-[1em] shrink-0" strokeWidth={2} aria-hidden />
              {CONTACT_PHONE_DISPLAY}
            </Link>
          </div>
        </div>
      </LandingSection>
      {/* <div className="my-dta-md md:my-dta-lg">
        <ContactDivider />
      </div>

      <LandingSection tone="base" id="message">
        <div className="mx-auto max-w-3xl space-y-dta-xl">
          <div>
            <h2 className={sectionLabelClassName}>Secondary Path</h2>
            <h3 className="mt-dta-sm max-w-[65ch] text-[clamp(1.4rem,3vw,1.75rem)] font-semibold tracking-[-0.03em] text-dta-text-primary">
              Prefer email first?
            </h3>
            <p className="mt-dta-md max-w-[65ch] text-base leading-[1.65] text-dta-text-secondary">
              Send your student&apos;s grade, subject, and goals. We&apos;ll reply with next
              steps.
            </p>
            <div className="mt-dta-xl border-t border-dta-border pt-dta-lg">
              <MessageForm />
            </div>
          </div>
        </div>
      </LandingSection> */}
    </main>
  );
}
