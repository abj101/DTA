"use client";

import * as React from "react";

import { sectionLabelClassName } from "@/components/landing/section";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF } from "@/lib/contact";
import { DTA_SCHEDULE_TZ, formatYmdInTimeZone } from "@/lib/pacific-date";
import { withBasePath } from "@/lib/base-path";
import { isStaticExport } from "@/lib/static-export";
import { cn } from "@/lib/utils";

const BOOKING_BUTTON_MOTION =
  "shadow-none transition-[color,background-color,border-color,box-shadow] duration-dta-hover ease-dta-premium";

const BOOKING_CTA_CLASS = cn(
  "w-full rounded-pill px-[22px] py-6 text-base font-semibold sm:h-12 sm:w-fit",
  BOOKING_BUTTON_MOTION,
  "hover:bg-primary/90 active:bg-primary/95",
);

const BOOKING_OUTLINE_BUTTON_CLASS = cn(
  "rounded-pill border-dta-border bg-transparent px-[22px] py-6 text-base font-semibold text-dta-text-primary sm:h-12 sm:w-fit",
  BOOKING_BUTTON_MOTION,
  "hover:border-dta-text-muted hover:bg-dta-surface hover:text-dta-text-primary active:border-dta-border active:bg-dta-raised",
);

const BOOKING_BODY_CLASS =
  "max-w-[62ch] text-[15px] leading-[1.7] text-dta-text-secondary md:text-base";

function formatSlot(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DTA_SCHEDULE_TZ,
  });
}

function formatSlotLong(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: DTA_SCHEDULE_TZ,
  });
}

type BookingSuccess = {
  startTime: string;
  cancelUrl: string;
  rescheduleUrl: string;
};

export function AppointmentPicker() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date(),
  );
  const [slots, setSlots] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(() => !isStaticExport);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [bookStatus, setBookStatus] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [bookError, setBookError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState<BookingSuccess | null>(
    null,
  );
  const requestSeqRef = React.useRef(0);

  const handleDateSelect = React.useCallback(
    async (date: Date | undefined) => {
      if (!date) return;
      const requestId = ++requestSeqRef.current;
      const ymd = formatYmdInTimeZone(date, DTA_SCHEDULE_TZ);

      setSelectedDate(date);
      setSelectedSlot(null);
      setFetchError(null);
      setBookError(null);
      setBookStatus("idle");
      setConfirmation(null);
      setSlots([]);

      if (isStaticExport) {
        setFetchError(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
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

        setSlots([]);
        setFetchError(
          data.detail ?? data.error ?? "Could not load availability.",
        );
      } catch {
        if (requestId !== requestSeqRef.current) return;
        setSlots([]);
        setFetchError("Could not load availability.");
      } finally {
        if (requestId === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  React.useEffect(() => {
    void handleDateSelect(new Date());
  }, [handleDateSelect]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookError(null);

    if (isStaticExport) {
      setBookStatus("error");
      setBookError(
        `Live booking is not available in this preview. Email us at ${CONTACT_EMAIL}.`,
      );
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setBookStatus("error");
      setBookError("Enter your name and email.");
      return;
    }

    setBookStatus("submitting");

    try {
      const res = await fetch(withBasePath("/api/book"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: selectedSlot,
          name: trimmedName,
          email: trimmedEmail,
          website: "",
        }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            detail?: string;
            startTime?: string;
            cancelUrl?: string;
            rescheduleUrl?: string;
          }
        | null;

      if (res.ok && payload?.ok !== false && payload?.cancelUrl && payload?.rescheduleUrl) {
        setBookStatus("success");
        setConfirmation({
          startTime: payload.startTime ?? selectedSlot,
          cancelUrl: payload.cancelUrl,
          rescheduleUrl: payload.rescheduleUrl,
        });
        return;
      }

      setBookStatus("error");
      setBookError(
        payload?.error ??
          (res.status === 409
            ? "That time was just booked. Pick another slot."
            : "Could not complete booking. Try another time or email us."),
      );
    } catch {
      setBookStatus("error");
      setBookError("Could not complete booking. Check your connection and try again.");
    }
  }

  function isDisabled(day: Date) {
    const todayYmd = formatYmdInTimeZone(new Date(), DTA_SCHEDULE_TZ);
    const candidateYmd = formatYmdInTimeZone(day, DTA_SCHEDULE_TZ);
    return candidateYmd < todayYmd;
  }

  const showConfirmation = confirmation !== null;

  return (
    <div className="relative grid [&>*]:col-start-1 [&>*]:row-start-1">
      <div
        className={cn(
          "flex flex-col gap-dta-xl transition-[opacity,transform] duration-dta-section ease-dta-premium motion-reduce:transition-none md:flex-row md:items-start md:gap-dta-xl",
          showConfirmation &&
            "pointer-events-none absolute inset-x-0 top-0 scale-[0.99] opacity-0 motion-reduce:scale-100",
        )}
        aria-hidden={showConfirmation}
      >
      <div className="w-full min-w-0 shrink-0 md:w-auto">
        <div className="flex justify-center md:justify-start">
          <Calendar
            mode="single"
            timeZone={DTA_SCHEDULE_TZ}
            noonSafe
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
            This preview build cannot load availability or book online. Email{" "}
            <a href={CONTACT_EMAIL_HREF} className="underline-offset-4 hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            to schedule.
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
                  BOOKING_BUTTON_MOTION,
                  selectedSlot === slot
                    ? "shadow-[0_0_40px_rgba(110,168,255,0.08)] hover:bg-primary/90 active:bg-primary/95"
                    : "hover:border-dta-text-muted hover:bg-dta-surface hover:text-dta-text-primary active:bg-dta-raised",
                )}
                onClick={() => {
                  setSelectedSlot(slot);
                  setBookError(null);
                  setBookStatus("idle");
                }}
              >
                {formatSlot(slot)}
              </Button>
            ))}
          </div>
        ) : null}

        {selectedSlot && !isStaticExport ? (
          <form
            className="space-y-dta-md border-t border-dta-border pt-dta-lg"
            onSubmit={handleBook}
            noValidate
          >
            <p className={sectionLabelClassName}>Your details</p>
            <div className="grid gap-dta-md sm:grid-cols-2">
              <div className="space-y-dta-sm">
                <Label htmlFor="book-name">Name</Label>
                <Input
                  id="book-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-dta-md border-dta-border bg-dta-base"
                />
              </div>
              <div className="space-y-dta-sm">
                <Label htmlFor="book-email">Email</Label>
                <Input
                  id="book-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-dta-md border-dta-border bg-dta-base"
                />
              </div>
            </div>
            <div className="sr-only" aria-hidden>
              <label htmlFor="book-website">Company website</label>
              <input id="book-website" name="website" tabIndex={-1} autoComplete="off" />
            </div>

            {bookError ? (
              <p className="text-sm text-destructive" role="alert">
                {bookError}
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              disabled={bookStatus === "submitting"}
              className={BOOKING_CTA_CLASS}
            >
              {bookStatus === "submitting"
                ? "Booking..."
                : `Book ${formatSlot(selectedSlot)} consultation`}
            </Button>
            <p className={cn(BOOKING_BODY_CLASS, "max-w-[48ch]")}>
              We&apos;ll confirm by email. Free, no commitment.
            </p>
          </form>
        ) : null}
      </div>
      </div>

      {showConfirmation && confirmation ? (
        <div className="dta-rise space-y-dta-lg" role="status" aria-live="polite">
          <div className="space-y-dta-sm">
            <p className={sectionLabelClassName}>Consultation booked</p>
            <p className="max-w-[58ch] font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
              You&apos;re set for {formatSlotLong(confirmation.startTime)} (Pacific)
            </p>
          </div>
          <p className={BOOKING_BODY_CLASS}>
            Calendly will email confirmation and meeting details to{" "}
            <span className="font-medium text-dta-text-primary">{email}</span>.
          </p>
          <div className="flex flex-wrap gap-dta-sm">
            <Button
              size="lg"
              className={BOOKING_CTA_CLASS}
              render={
                <a
                  href={confirmation.rescheduleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={BOOKING_OUTLINE_BUTTON_CLASS}
              render={
                <a
                  href={confirmation.cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              nativeButton={false}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
