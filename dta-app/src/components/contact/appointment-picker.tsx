"use client";

import * as React from "react";

import { sectionLabelClassName } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DTA_SCHEDULE_TZ,
  formatYmdInTimeZone,
  getZonedWeekdaySun0,
} from "@/lib/pacific-date";
import { withBasePath } from "@/lib/base-path";
import { isStaticExport } from "@/lib/static-export";
import { cn } from "@/lib/utils";

function formatSlot(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DTA_SCHEDULE_TZ,
  });
}

function buildCalendlyUrl() {
  const username = process.env.NEXT_PUBLIC_CALENDLY_USERNAME ?? "";
  const slug = process.env.NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG ?? "";
  const base = `https://calendly.com/${username}/${slug}`;
  return base;
}

export function AppointmentPicker() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [slots, setSlots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [calendlyReady, setCalendlyReady] = React.useState(
    () => typeof window !== "undefined" && Boolean(window.Calendly),
  );
  const requestSeqRef = React.useRef(0);

  React.useEffect(() => {
    return () => {
      window.Calendly?.closePopupWidget();
    };
  }, []);

  React.useEffect(() => {
    const markReady = () => {
      queueMicrotask(() => setCalendlyReady(true));
    };

    if (window.Calendly) {
      markReady();
      return;
    }

    window.addEventListener("calendly:ready", markReady);
    return () => {
      window.removeEventListener("calendly:ready", markReady);
    };
  }, []);

  async function handleDateSelect(date: Date | undefined) {
    if (!date) return;
    const requestId = ++requestSeqRef.current;
    const ymd = formatYmdInTimeZone(date, DTA_SCHEDULE_TZ);

    setSelectedDate(date);
    setSelectedSlot(null);
    setFetchError(null);

    if (isStaticExport) {
      setSlots([]);
      setFetchError(null);
      return;
    }

    setLoading(true);

    try {
      let lastError = "Could not load availability.";
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await fetch(
          withBasePath(`/api/availability?date=${encodeURIComponent(ymd)}`),
        );
        const data = (await res.json()) as {
          slots?: string[];
          error?: string;
          detail?: string;
        };

        if (requestId !== requestSeqRef.current) return;

        if (res.ok) {
          setSlots(data.slots ?? []);
          setFetchError(null);
          return;
        }

        lastError = data.detail ?? data.error ?? "Could not load availability.";
        if (attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      setSlots([]);
      setFetchError(lastError);
    } catch {
      if (requestId !== requestSeqRef.current) return;
      setSlots([]);
      setFetchError("Could not load availability.");
    } finally {
      if (requestId === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }

  function openCalendlyPopup() {
    const username = process.env.NEXT_PUBLIC_CALENDLY_USERNAME ?? "";
    const slug = process.env.NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG ?? "";
    if (!username || !slug) {
      setFetchError("Calendly is not configured yet. Please contact us to book.");
      return;
    }

    const url = buildCalendlyUrl();
    if (!window.Calendly?.initPopupWidget) return;
    window.Calendly.initPopupWidget({ url });
  }

  function handleBook() {
    if (isStaticExport) {
      openCalendlyPopup();
      return;
    }
    if (!selectedSlot || !selectedDate) return;
    openCalendlyPopup();
  }

  function isDisabled(day: Date) {
    const todayYmd = formatYmdInTimeZone(new Date(), DTA_SCHEDULE_TZ);
    const candidateYmd = formatYmdInTimeZone(day, DTA_SCHEDULE_TZ);
    const weekday = getZonedWeekdaySun0(day, DTA_SCHEDULE_TZ);
    return candidateYmd < todayYmd || weekday === 0 || weekday === 6;
  }

  return (
    <div className="flex flex-col gap-dta-xl md:flex-row md:items-start md:gap-dta-xl">
      <div className="w-full min-w-0 shrink-0 md:w-auto">
        <div className="flex justify-center md:justify-start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={isDisabled}
            showOutsideDays={false}
            className="rounded-dta-lg border border-dta-border bg-dta-surface p-dta-sm shadow-none"
            buttonVariant="ghost"
          />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-dta-md">
        <div className="space-y-dta-sm">
          <p className={sectionLabelClassName}>Available times</p>
          {!selectedDate ? (
            <p className="max-w-[34ch] text-[15px] leading-[1.6] text-dta-text-secondary">
              Choose a date to see open slots.
            </p>
          ) : null}
        </div>

        {fetchError ? (
          <p className="text-sm text-destructive" role="alert">
            {fetchError}
          </p>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 gap-dta-sm sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-pill" />
            ))}
          </div>
        ) : null}

        {isStaticExport && selectedDate ? (
          <p className="max-w-[40ch] text-[15px] leading-[1.6] text-dta-text-secondary">
            This preview build does not load server availability. Open Calendly
            for live times; you can still pick a day here to plan ahead.
          </p>
        ) : null}

        {!isStaticExport &&
        !loading &&
        slots.length === 0 &&
        selectedDate &&
        !fetchError ? (
          <p className="max-w-[34ch] text-[15px] leading-[1.6] text-dta-text-secondary">
            No openings on this date. Try another.
          </p>
        ) : null}

        {!loading && slots.length > 0 ? (
          <div className="grid grid-cols-2 gap-dta-sm sm:grid-cols-3">
            {slots.map((slot) => (
              <Button
                key={slot}
                type="button"
                variant={selectedSlot === slot ? "default" : "outline"}
                size="lg"
                className={cn(
                  "rounded-pill font-semibold sm:h-11",
                  selectedSlot === slot &&
                    "shadow-[0_0_40px_rgba(110,168,255,0.08)] hover:bg-primary/90",
                )}
                onClick={() => setSelectedSlot(slot)}
              >
                {formatSlot(slot)}
              </Button>
            ))}
          </div>
        ) : null}

        {isStaticExport && selectedDate ? (
          <div className="border-t border-dta-border pt-dta-lg">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-pill px-[22px] py-6 text-base font-semibold sm:h-12 sm:w-fit"
              onClick={handleBook}
              disabled={!calendlyReady}
            >
              {calendlyReady ? "Open Calendly" : "Loading..."}
            </Button>
          </div>
        ) : null}

        {!isStaticExport && selectedSlot ? (
          <div className="border-t border-dta-border pt-dta-lg">
            <div className="flex flex-col gap-dta-sm sm:gap-dta-md">
              <Button
                type="button"
                size="lg"
                className="w-full rounded-pill px-[22px] py-6 text-base font-semibold sm:h-12 sm:w-fit"
                onClick={handleBook}
                disabled={!calendlyReady}
              >
                {calendlyReady ? "Confirm on Calendly" : "Loading..."}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
