import type { Metadata } from "next";

import { AppointmentPicker } from "@/components/contact/appointment-picker";
// import { MessageForm } from "@/components/contact/message-form";
import { LandingSection, sectionLabelClassName } from "@/components/landing/section";

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
    <main className="flex flex-1 flex-col bg-dta-base">
      <LandingSection tone="base" id="book">
        <h2 className={sectionLabelClassName}>Book Free Consultation</h2>
        <h3 className="mt-dta-sm max-w-[65ch] text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.03em] text-dta-text-primary">
          Let&apos;s build a plan for your student
        </h3>
        <div className="mt-dta-xl border-t border-dta-border pt-dta-lg">
          <AppointmentPicker />
        </div>

        <div className="mt-[clamp(1.75rem,4vw,2.5rem)] border-t border-dta-border pt-dta-lg">
          <p className={sectionLabelClassName}>What to expect</p>
          <p className="mt-dta-sm max-w-[58ch] font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
            30 minutes. Free. No commitment.
          </p>
          <p className="mt-dta-md max-w-[62ch] text-[15px] leading-[1.7] text-dta-text-secondary md:text-base">
            We&apos;ll ask about your student&apos;s courses, goals, and
            what&apos;s been hard. By the end of the call, we&apos;ll tell you
            honestly whether we&apos;re the right fit. If we&apos;re not,
            we&apos;ll say so.
          </p>
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
