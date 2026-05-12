"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { sectionLabelClassName } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BOOKING_CTA_NAV_LAYOUT } from "@/lib/booking-cta";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

function navLinkClass(pathname: string, href: string) {
  return pathname === href
    ? "text-dta-nav-link-active"
    : "text-dta-nav-link hover:text-dta-nav-link-active";
}

export function SiteNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const onMobileOpenChange = React.useCallback((open: boolean) => {
    queueMicrotask(() => {
      setMobileOpen(open);
    });
  }, []);

  function goToLandingHome(e: React.MouseEvent<HTMLAnchorElement>) {
    const onHome = pathname === "/" || pathname === "";
    if (!onHome) return;
    e.preventDefault();
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="flex h-14 w-full items-center justify-between px-dta-md md:h-[var(--dta-space-nav-height)] md:px-dta-lg lg:px-[var(--dta-space-gutter)]">
        <Link
          href="/"
          aria-label="Dublin Tutoring Association — home"
          className="shrink-0 text-lg font-bold tracking-tight text-dta-nav-link-active md:text-[1.0625rem]"
          onClick={goToLandingHome}
        >
          DTA
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <nav
            className="flex items-center gap-6 lg:gap-8"
            aria-label="Primary"
          >
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-2 text-[15px] font-medium transition-colors duration-dta-hover ease-dta-premium",
                  navLinkClass(pathname, href),
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <Button
            variant="default"
            size="default"
            className={cn(
              BOOKING_CTA_NAV_LAYOUT,
              "shrink-0 rounded-dta-sm border-0 bg-dta-nav-cta text-white hover:bg-dta-nav-cta-hover",
            )}
            render={<Link href="/contact" />}
            nativeButton={false}
          >
            <span className="leading-none">Book Free Consultation</span>
          </Button>
        </div>

        <div className="flex items-center md:hidden">
          <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange} modal>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                >
                  <MenuIcon className="size-5 text-dta-nav-link" />
                </Button>
              }
            />
            <SheetContent
              side="right"
              className="border-l-border bg-popover p-0 sm:max-w-sm supports-backdrop-filter:backdrop-blur-xs"
              showCloseButton
            >
              <SheetHeader className="border-b border-border px-dta-md py-dta-md text-left">
                <SheetTitle className={sectionLabelClassName}>Menu</SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-dta-xs px-dta-md py-dta-lg"
                aria-label="Mobile primary"
              >
                {NAV_ITEMS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "rounded-dta-md px-dta-md py-3 text-base font-medium transition-colors duration-dta-hover ease-dta-premium",
                      navLinkClass(pathname, href),
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
                <Button
                  variant="default"
                  size="default"
                  className={cn(
                    BOOKING_CTA_NAV_LAYOUT,
                    "mt-dta-md h-10 min-h-10 w-full rounded-dta-sm border-0 bg-dta-nav-cta text-white hover:bg-dta-nav-cta-hover",
                  )}
                  render={
                    <Link
                      href="/contact"
                      onClick={() => setMobileOpen(false)}
                    />
                  }
                  nativeButton={false}
                >
                  <span className="leading-none">Book Free Consultation</span>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
