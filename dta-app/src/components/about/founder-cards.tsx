import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  LandingSection,
  sectionLabelClassName,
} from "@/components/landing/section";

const FOUNDERS = [
  {
    name: "Ayush Bakhandi",
    schoolLine: "DHS/Athenian '22 · UC Berkeley '25",
    degreeLine: "B.S. Molecular Environmental Biology",
    bio: "With over 6 years of tutoring experience, I have worked with middle and high school students across math, science, biology, physics, and English. I focus on building confidence, curiosity, and strong study habits. I currently work as a medical assistant at a glaucoma clinic and conduct research at UCSF, which keeps me closely connected to the sciences I love to teach. Outside of work, I enjoy skiing, watching basketball, and baking.",
    imageSrc: "/founders/ayush-bakhandi-portrait.png",
    imageAlt: "Ayush Bakhandi, co-founder of Dublin Tutoring Association",
    initials: "AB",
  },
  {
    name: "Ayush Bandopadhyay",
    schoolLine: "DHS '22 · UC Santa Cruz '26",
    degreeLine: "B.S. Computer Science & Game Design",
    bio: "I've spent the past 10 years tutoring and mentoring, starting from peer tutor to board member of the Freshman Mentorship Program to teaching assistant and grader at university. Along the way I've covered math, physics, English, and programming. Currently I'm the lead programmer in an indie game studio based in UC Santa Cruz. In my free time, I build Legos, swim, play video games, and enjoy grilling.",
    imageSrc: "/founders/ayush-bandopadhyay-portrait.jpg",
    imageAlt:
      "Ayush Bandopadhyay, co-founder of Dublin Tutoring Association",
    initials: "AB",
  },
] as const;

export function FounderCards() {
  return (
    <LandingSection tone="base" compact>
      <div className="dta-rise" style={{ animationDelay: "150ms" }}>
        <h2 className={sectionLabelClassName}>Founders</h2>
        <div className="mt-dta-lg grid gap-dta-lg md:grid-cols-2 md:gap-dta-xl">
          {FOUNDERS.map((f) => (
            <article key={f.name} className="flex flex-col gap-dta-lg py-dta-lg">
              <div className="flex flex-col gap-dta-lg">
                <Avatar
                  data-slot="founder-avatar"
                  className="size-[5.5rem] shrink-0 rounded-full border-0 bg-transparent shadow-none after:border-dta-border md:size-24"
                >
                  <AvatarImage
                    src={f.imageSrc}
                    alt={f.imageAlt}
                    width={192}
                    height={192}
                  />
                  <AvatarFallback className="bg-dta-elevated text-lg font-semibold text-dta-text-secondary">
                    {f.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-dta-sm">
                  <h3 className="font-heading text-[20px] font-semibold leading-snug tracking-[-0.02em] text-dta-text-primary">
                    {f.name}
                  </h3>
                  <p className="text-[15px] leading-snug text-dta-text-secondary md:text-base md:leading-relaxed">
                    {f.schoolLine}
                    <br />
                    {f.degreeLine}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[15px] leading-relaxed text-dta-text-secondary md:text-base md:leading-[1.65]">
                  {f.bio}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
