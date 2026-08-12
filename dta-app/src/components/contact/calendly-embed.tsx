"use client";

import * as React from "react";

import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { getCalendlySchedulingUrl } from "@/lib/calendly-public";

const CALENDLY_SCRIPT_SRC =
  "https://assets.calendly.com/assets/external/widget.js";
const CALENDLY_CSS_HREF =
  "https://assets.calendly.com/assets/external/widget.css";

type CalendlyMessageData = {
  event?: string;
  payload?: { height?: string | number };
};

function isCalendlyMessage(data: unknown): data is CalendlyMessageData {
  return (
    typeof data === "object" &&
    data !== null &&
    "event" in data &&
    typeof (data as CalendlyMessageData).event === "string" &&
    (data as CalendlyMessageData).event!.startsWith("calendly.")
  );
}

function parseCalendlyHeight(height: string | number | undefined): number | null {
  if (typeof height === "number" && Number.isFinite(height)) {
    return Math.ceil(height);
  }
  if (typeof height === "string") {
    const n = Number.parseFloat(height);
    return Number.isFinite(n) ? Math.ceil(n) : null;
  }
  return null;
}

function ensureCalendlyAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (!document.querySelector(`link[href="${CALENDLY_CSS_HREF}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CALENDLY_CSS_HREF;
    document.head.appendChild(link);
  }

  if (window.Calendly) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${CALENDLY_SCRIPT_SRC}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.Calendly) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Calendly")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CALENDLY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Calendly"));
    document.head.appendChild(script);
  });
}

/**
 * Standard Calendly inline embed sized to the remaining viewport so the
 * calendar is visible without page scroll.
 * Custom API-backed picker is parked in `appointment-picker.custom.tsx`.
 */
export function CalendlyEmbed() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [heightPx, setHeightPx] = React.useState(700);
  const contentHeightRef = React.useRef(700);
  const schedulingUrl = getCalendlySchedulingUrl();

  const syncHeight = React.useCallback(() => {
    setHeightPx(Math.max(480, contentHeightRef.current));
  }, []);

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://calendly.com") return;
      if (!isCalendlyMessage(event.data)) return;
      if (event.data.event !== "calendly.page_height") return;

      const next = parseCalendlyHeight(event.data.payload?.height);
      if (next !== null && next > 0) {
        contentHeightRef.current = next;
        syncHeight();
      }
    }

    window.addEventListener("message", onMessage);
    syncHeight();

    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, [syncHeight]);

  React.useEffect(() => {
    const parent = containerRef.current;
    if (!parent || !schedulingUrl) return;

    let cancelled = false;

    void (async () => {
      try {
        await ensureCalendlyAssets();
        if (cancelled || !containerRef.current || !window.Calendly) return;

        parent.replaceChildren();
        window.Calendly.initInlineWidget({
          url: schedulingUrl,
          parentElement: parent,
        });
        syncHeight();
      } catch {
        if (!cancelled) {
          setError("Could not load the scheduling calendar.");
        }
      }
    })();

    return () => {
      cancelled = true;
      parent.replaceChildren();
    };
  }, [schedulingUrl, syncHeight]);

  if (!schedulingUrl) {
    return (
      <p className="max-w-[48ch] text-[15px] leading-[1.7] text-dta-text-secondary md:text-base">
        Scheduling is not configured yet. Email{" "}
        <a
          href={CONTACT_EMAIL_HREF}
          className="underline-offset-4 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>{" "}
        to book a consultation.
      </p>
    );
  }

  return (
    <div className="w-full">
      {error ? (
        <p className="mb-dta-sm text-sm text-destructive" role="alert">
          {error}{" "}
          <a
            href={schedulingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            Open Calendly instead
          </a>
          .
        </p>
      ) : null}
      <div
        ref={containerRef}
        className="calendly-inline-widget w-full min-w-[320px] overflow-hidden [&_iframe]:!h-full"
        style={{ height: heightPx }}
        data-url={schedulingUrl}
      />
    </div>
  );
}
