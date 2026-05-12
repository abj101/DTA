"use client";

import * as React from "react";

const CALENDLY_OVERLAY_SELECTOR = ".calendly-overlay";

export function CalendlyScript() {
  React.useEffect(() => {
    let reservedScrollbarPx = 0;

    function scrollbarWidthPx() {
      return Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth,
      );
    }

    function syncCalendlyScrollLock() {
      const open = document.querySelector(CALENDLY_OVERLAY_SELECTOR) !== null;
      if (open) {
        if (reservedScrollbarPx === 0) {
          reservedScrollbarPx = scrollbarWidthPx();
        }
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.paddingRight =
          reservedScrollbarPx > 0 ? `${reservedScrollbarPx}px` : "";
        return;
      }
      reservedScrollbarPx = 0;
      document.documentElement.style.overflow = "";
      document.documentElement.style.paddingRight = "";
    }

    const observer = new MutationObserver(() => {
      syncCalendlyScrollLock();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    syncCalendlyScrollLock();
    return () => {
      observer.disconnect();
      reservedScrollbarPx = 0;
      document.documentElement.style.overflow = "";
      document.documentElement.style.paddingRight = "";
    };
  }, []);

  React.useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="calendly.com/assets/external/widget.js"]',
    );
    if (existingScript) {
      if (window.Calendly) {
        window.dispatchEvent(new Event("calendly:ready"));
        return;
      }

      const onLoad = () => window.dispatchEvent(new Event("calendly:ready"));
      existingScript.addEventListener("load", onLoad, { once: true });
      return () => {
        existingScript.removeEventListener("load", onLoad);
      };
    }

    if (window.Calendly) {
      window.dispatchEvent(new Event("calendly:ready"));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    script.onload = () => window.dispatchEvent(new Event("calendly:ready"));
    document.head.appendChild(script);
  }, []);

  return null;
}
