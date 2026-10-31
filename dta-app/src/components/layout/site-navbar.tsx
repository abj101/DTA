"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MenuIcon } from "lucide-react";

import { sectionLabelClassName } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CONTACT_EMAIL_HREF } from "@/lib/contact";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/office-hours", label: "Hours" },
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
          <Button className="shrink-0 rounded-dta-sm border-0 bg-dta-nav-cta text-white hover:bg-dta-nav-cta-hover" render={<a href={CONTACT_EMAIL_HREF} />} nativeButton={false}>
            <Mail className="size-4" aria-hidden />
            Email us
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Button className="h-9 rounded-dta-sm border-0 bg-dta-nav-cta px-3 text-white hover:bg-dta-nav-cta-hover" render={<a href={CONTACT_EMAIL_HREF} />} nativeButton={false}>
            <Mail className="size-4" aria-hidden />
            Email us
          </Button>
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
