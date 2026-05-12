import { cn } from "@/lib/utils";

/** Full-bleed rule between landing/about blocks; pairs with `overflow-x: clip` on `html` in globals. */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <hr
        className="divider relative left-1/2 w-[calc(100vw-(2*clamp(1rem,3.5vw,3.125rem)))] max-w-none -translate-x-1/2 border-0 border-t border-dta-border"
        aria-hidden
      />
    </div>
  );
}
