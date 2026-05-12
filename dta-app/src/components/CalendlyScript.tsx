"use client";

import * as React from "react";

export function CalendlyScript() {
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
