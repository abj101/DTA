import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";

export default function ContactPage() {
  return <main className="flex flex-1 flex-col bg-dta-base px-dta-md py-dta-xl"><div className="mx-auto w-full max-w-6xl"><h1 className="font-heading text-3xl font-semibold">Get in touch</h1><p className="mt-dta-md text-dta-text-secondary">Email us at <a className="underline" href={CONTACT_EMAIL_HREF}>{CONTACT_EMAIL}</a>.</p></div></main>;
}
