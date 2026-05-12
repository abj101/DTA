import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Uppercase section kicker; matches hero index line mono treatment (`hero.tsx`). */
export const sectionLabelClassName =
  "font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-dta-text-muted md:text-xs";

type LandingSectionProps = {
  id?: string;
  /** Surface band: default page root, raised alternate rhythm */
  tone?: "base" | "raised";
  /** Tighter vertical padding for dense landing stacks */
  compact?: boolean;
  className?: string;
  children: ReactNode;
};

export function LandingSection({
  id,
  tone = "base",
  compact = false,
  className,
  children,
}: LandingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-24 md:scroll-mt-28",
        tone === "raised" && "bg-dta-raised",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-6xl px-dta-md md:px-dta-lg",
          compact
            ? "py-dta-md md:py-dta-lg"
            : "py-[clamp(3.75rem,10vw,6.25rem)]",
        )}
      >
        <div className="mx-auto max-w-[min(100%,52rem)]">{children}</div>
      </div>
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={sectionLabelClassName}>{children}</p>;
}

export function SectionHeadline({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <Tag
      className={cn(
        "mt-dta-sm max-w-[65ch] text-[28px] font-semibold tracking-[-0.03em] text-dta-text-primary sm:text-[32px] sm:leading-[1.2]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
