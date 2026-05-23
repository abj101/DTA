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
    bio: "With over 6 years of tutoring experience, Ayush brings both depth of knowledge and a genuine passion for student growth. As a Dean's List and Honors UC Berkeley graduate, Ayush approaches teaching with a focus on building confidence and curiosity while mastering subject material. He currently works as a medical assistant at a glaucoma clinic and conducts research at UCSF, keeping him closely connected to the sciences he loves to teach. Outside of work, Ayush can be found skiing, watching basketball, and baking.",
    imageSrc: "/founders/ayush-bakhandi-portrait-placeholder.svg",
    imageAlt:
      "Ayush Bakhandi, co-founder of Dublin Tutoring Association (portrait placeholder)",
    initials: "AB",
  },
  {
    name: "Ayush Bandopadhyay",
    schoolLine: "DHS '22 · UC Santa Cruz '26",
    degreeLine: "B.S. Computer Science & Game Design",
    bio: "Since 6th grade, Ayush has been drawn to helping others learn, from tutoring kids at Green Elementary to freshmen through high school as a peer tutor and board member of the Freshman Mentor Program. He carried the same dedication to UC Santa Cruz, where he graduated on the Dean's List and worked as a teaching assistant and grader for math and engineering courses. He is now part of a game development team at UC Santa Cruz, bringing together his long-running interests in programming and game design. In his free time, Ayush reads, plays video games, swims, and enjoys manning the grill.",
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
