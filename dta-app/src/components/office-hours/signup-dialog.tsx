"use client";

import * as React from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  CalendarPlusIcon,
  CheckIcon,
  CircleAlertIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";

import { sectionLabelClassName } from "@/components/landing/section";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { withBasePath } from "@/lib/base-path";
import { downloadIcs } from "@/lib/ics-invite";
import type {
  SignupResponse,
  SignupSlotsResponse,
  SignupSlotsView,
  SignupValidateResponse,
} from "@/lib/office-hours-signup-schema";
import { cn } from "@/lib/utils";

const NAME_CHECK_DEBOUNCE_MS = 400;

const PILL_MOTION =
  "shadow-none transition-[color,background-color,border-color,box-shadow] duration-dta-hover ease-dta-premium";

const PRIMARY_PILL_CLASS = cn(
  "rounded-pill px-[22px] font-semibold",
  PILL_MOTION,
  "hover:bg-dta-inverse-hover active:bg-dta-inverse-active",
);

const OUTLINE_PILL_CLASS = cn(
  "rounded-pill border-dta-border bg-transparent px-[22px] font-semibold text-dta-text-primary",
  PILL_MOTION,
  "hover:border-dta-text-muted hover:bg-dta-raised hover:text-dta-text-primary active:bg-[var(--dta-bg-soft)]",
);

const LINK_CLASS =
  "underline decoration-dta-border underline-offset-[5px] transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary";

const SLOT_PILL_BASE =
  "inline-flex h-10 w-full items-center justify-center rounded-pill border text-sm font-semibold outline-none transition-[color,background-color,border-color,box-shadow] duration-dta-card ease-dta-premium motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-ring/50";

const SLOT_PILL_STATE = {
  open: "border-dta-border bg-transparent text-dta-text-primary hover:border-dta-text-muted hover:bg-dta-raised active:bg-[var(--dta-bg-soft)]",
  selected:
    "border-transparent bg-primary text-primary-foreground hover:bg-dta-inverse-hover active:bg-dta-inverse-active",
  taken:
    "cursor-not-allowed border-transparent bg-dta-surface text-dta-text-muted",
  dropIn: "border-transparent bg-dta-inverse-bg text-dta-inverse-text",
} as const;

const FADE_MOTION =
  "transition-[opacity,translate,scale] duration-dta-card ease-dta-premium motion-reduce:transition-none";

const MESSAGE_MOTION =
  "transition-[opacity,translate] duration-dta-section ease-dta-premium motion-reduce:transition-none";

const ROW_HEADER_CLASS =
  "p-0 text-left text-[13px] font-medium leading-snug text-dta-text-secondary sm:whitespace-nowrap sm:text-[15px]";

const FIELD_CLASS =
  "rounded-dta-md border-dta-border bg-transparent text-base text-dta-text-primary md:text-sm";

/** `data` always holds the layout so the dialog never resizes while availability loads. */
type SlotsState =
  | { status: "loading" | "ready"; data: SignupSlotsView }
  | { status: "error"; error: string; data: SignupSlotsView };

type NameStatus =
  | "idle"
  | "checking"
  | "valid"
  | "notFound"
  | "alreadyBooked"
  | "error";

const NAME_WARNINGS: Partial<Record<NameStatus, string>> = {
  notFound: "We couldn't find an active student with that name.",
  alreadyBooked: "You already have an upcoming office hours signup.",
  error: "Could not check that name. Try again in a moment.",
};

type BookedSignup = Extract<SignupResponse, { ok: true }> & { date: string };

function downloadBookingInvite(booked: BookedSignup) {
  const { venue, address, mapsHref } = booked.location;
  downloadIcs("dta-office-hours.ics", {
    uid: `${booked.start}-${booked.tutorName.replace(/\s+/g, "-")}@dublintutoring`,
    start: booked.start,
    end: booked.end,
    summary: `DTA office hours with ${booked.tutorName}`,
    description: `Office hours slot with ${booked.tutorName}, booked on the DTA website.`,
    location: [venue, address].filter(Boolean).join(", "),
    url: mapsHref ?? undefined,
  });
}

function BookedLocation({ booked }: { booked: BookedSignup }) {
  const { venue, address, mapsHref } = booked.location;
  return (
    <p className="mt-dta-xs text-[15px] text-dta-text-secondary">
      {booked.date ? `${booked.date} · ` : null}
      {venue}
      {address ? (
        <>
          {" · "}
          {mapsHref ? (
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              {address}
            </a>
          ) : (
            address
          )}
        </>
      ) : null}
    </p>
  );
}

async function readJson<T>(res: Response): Promise<T | null> {
  return (await res.json().catch(() => null)) as T | null;
}

/** Keeps the last non-null value so text can fade out instead of vanishing. */
function useLastNonNull<T>(value: T | null): T | null {
  const [last, setLast] = React.useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}

export function OfficeHoursSignup({ initial }: { initial: SignupSlotsView }) {
  const [open, setOpen] = React.useState(false);
  const [slots, setSlots] = React.useState<SlotsState>({
    status: "loading",
    data: initial,
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [nameStatus, setNameStatus] = React.useState<NameStatus>("idle");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [booked, setBooked] = React.useState<BookedSignup | null>(null);
  const websiteRef = React.useRef<HTMLInputElement>(null);

  async function loadSlots() {
    try {
      const res = await fetch(withBasePath("/api/office-hours/slots"), {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await readJson<SignupSlotsResponse>(res);
      if (payload?.ok) {
        setSlots({ status: "ready", data: payload });
        setSelectedId((id) =>
          payload.slots.some((slot) => slot.id === id && !slot.taken) ? id : null,
        );
        return;
      }
      setSlots(({ data }) => ({
        status: "error",
        error: payload?.error ?? "Could not load open slots. Try again in a moment.",
        data,
      }));
    } catch {
      setSlots(({ data }) => ({
        status: "error",
        error: "Network error. Try again in a moment.",
        data,
      }));
    }
  }

  const trimmedName = name.trim();
  React.useEffect(() => {
    if (!open || !trimmedName) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(withBasePath("/api/office-hours/validate"), {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
          signal: controller.signal,
        });
        const payload = await readJson<SignupValidateResponse>(res);
        setNameStatus(payload?.ok ? payload.status : "error");
      } catch {
        if (!controller.signal.aborted) setNameStatus("error");
      }
    }, NAME_CHECK_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, trimmedName]);

  function handleNameChange(value: string) {
    setName(value);
    setSubmitError(null);
    setNameStatus(value.trim() ? "checking" : "idle");
  }

  function reset() {
    setSlots(({ data }) => ({ status: "loading", data }));
    setSelectedId(null);
    setName("");
    setNotes("");
    setNameStatus("idle");
    setSubmitting(false);
    setSubmitError(null);
    setBooked(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId || !notes.trim() || nameStatus !== "valid" || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(withBasePath("/api/office-hours/signup"), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          slotId: selectedId,
          notes: notes.trim(),
          website: websiteRef.current?.value ?? "",
        }),
      });
      const payload = await readJson<SignupResponse>(res);

      if (payload?.ok) {
        setBooked({
          ...payload,
          date: slots.data.session.date,
        });
        return;
      }

      if (payload?.status === "notFound" || payload?.status === "alreadyBooked") {
        setNameStatus(payload.status);
        return;
      }
      setSubmitError(
        payload?.error ?? "Could not complete your signup. Try again in a moment.",
      );
      if (payload?.status === "slotTaken") {
        setSelectedId(null);
        void loadSlots();
      }
    } catch {
      setSubmitError("Network error. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const busy = nameStatus === "checking" || submitting;
  const canConfirm =
    Boolean(selectedId) && Boolean(notes.trim()) && nameStatus === "valid" && !submitting;
  const warning =
    submitError ?? NAME_WARNINGS[nameStatus] ?? null;
  const missingHint =
    nameStatus !== "valid" || submitting
      ? null
      : !selectedId
        ? "Pick a time slot above to continue."
        : !notes.trim()
          ? "Add a note so your tutor knows what you need."
          : null;
  const hint = warning ? null : missingHint;
  const shownWarning = useLastNonNull(warning);
  const shownHint = useLastNonNull(hint);
  const showConfirmation = booked !== null;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void loadSlots();
      }}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) reset();
      }}
    >
      <Dialog.Trigger
        render={
          <Button
            size="lg"
            className={cn(PRIMARY_PILL_CLASS, "mt-dta-md h-10 w-full text-[15px]")}
          />
        }
      >
        Sign up
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 transition-opacity duration-dta-section ease-dta-premium data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none supports-backdrop-filter:backdrop-blur-xs sm:duration-dta-card" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-dta-lg">
          <Dialog.Popup
            className={cn(
              "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-dta-xl bg-dta-base p-dta-md text-dta-text-primary sm:p-dta-lg shadow-lg outline-none sm:max-w-[37rem] sm:rounded-dta-xl",
              "transition-[opacity,translate,scale] duration-dta-section ease-dta-premium motion-reduce:transition-none sm:duration-dta-card",
              "data-starting-style:translate-y-full data-ending-style:translate-y-full",
              "sm:data-starting-style:translate-y-2 sm:data-starting-style:scale-[0.98] sm:data-starting-style:opacity-0 sm:data-ending-style:translate-y-2 sm:data-ending-style:scale-[0.98] sm:data-ending-style:opacity-0",
            )}
          >
            <Dialog.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-2 right-2 z-10 size-8 sm:top-4 sm:right-4 rounded-full text-dta-text-secondary hover:bg-[var(--dta-bg-soft)] hover:text-dta-text-primary active:bg-[var(--dta-border-subtle)]"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Dialog.Close>

            <div className="relative grid [&>*]:col-start-1 [&>*]:row-start-1">
              <div
                inert={showConfirmation}
                className={cn(
                  "transition-[opacity,scale] duration-dta-section ease-dta-premium motion-reduce:transition-none",
                  showConfirmation &&
                    "pointer-events-none absolute inset-0 scale-[0.99] overflow-hidden opacity-0 motion-reduce:scale-100",
                )}
              >
                <p className={cn(sectionLabelClassName, "leading-4")}>Office hours signup</p>
                <Dialog.Title className="mt-dta-sm pr-10 font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-6 tracking-[-0.02em] text-dta-text-primary sm:leading-7">
                  {slots.data.session.date}
                </Dialog.Title>
                <Dialog.Description className="mt-dta-xs text-[15px] leading-[22px] text-dta-text-secondary">
                  {slots.data.session.time}
                </Dialog.Description>

                <SlotTable
                  state={slots}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    setSelectedId((current) => (current === id ? null : id));
                    setSubmitError(null);
                  }}
                />

                <form className="mt-dta-lg space-y-dta-md" onSubmit={handleSubmit} noValidate>
                  <div className="space-y-dta-sm">
                    <Label htmlFor="office-hours-notes" className="gap-0">
                      Notes<span aria-hidden>*</span>
                    </Label>
                    <Textarea
                      id="office-hours-notes"
                      name="notes"
                      required
                      rows={3}
                      maxLength={500}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What do you want help with?"
                      className={cn(FIELD_CLASS, "min-h-[88px]")}
                    />
                  </div>

                  <div className="sr-only">
                    <label htmlFor="office-hours-website">Company website</label>
                    <input
                      ref={websiteRef}
                      id="office-hours-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex items-start gap-dta-sm">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        id="office-hours-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        placeholder="Student Full Name"
                        aria-label="Student Full Name"
                        aria-invalid={nameStatus === "notFound" || nameStatus === "alreadyBooked"}
                        aria-describedby="office-hours-name-message"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        maxLength={120}
                        className={cn(FIELD_CLASS, "!h-11 pr-10 pl-dta-md")}
                      />
                      <CheckIcon
                        aria-hidden
                        strokeWidth={2.5}
                        className={cn(
                          "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-dta-status-text transition-opacity duration-dta-hover ease-dta-premium motion-reduce:transition-none",
                          nameStatus === "valid" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!canConfirm}
                      aria-busy={busy}
                      className={cn(PRIMARY_PILL_CLASS, "!h-11 min-w-[7.5rem] text-[15px]")}
                    >
                      {busy ? (
                        <>
                          <Loader2Icon
                            className="size-5 animate-spin motion-reduce:animate-none"
                            aria-hidden
                          />
                          <span className="sr-only">
                            {submitting ? "Booking" : "Checking name"}
                          </span>
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </Button>
                  </div>

                  <div
                    id="office-hours-name-message"
                    className="-mt-1.5 grid min-h-10 pl-dta-md text-sm leading-5 sm:min-h-5 [&>*]:col-start-1 [&>*]:row-start-1"
                  >
                    <p role="alert" className="text-destructive">
                      <span
                        aria-hidden={!warning}
                        className={cn(
                          "flex items-start gap-1.5",
                          MESSAGE_MOTION,
                          warning ? "opacity-100" : "-translate-y-1 opacity-0",
                        )}
                      >
                        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {shownWarning}
                      </span>
                    </p>
                    <p role="status" className="text-dta-text-secondary">
                      {nameStatus === "valid" && !warning ? (
                        <span className="sr-only">Name confirmed. </span>
                      ) : null}
                      <span
                        aria-hidden={!hint}
                        className={cn(
                          "block",
                          MESSAGE_MOTION,
                          hint ? "opacity-100" : "-translate-y-1 opacity-0",
                        )}
                      >
                        {shownHint}
                      </span>
                    </p>
                  </div>
                </form>
              </div>

              <div
                inert={!showConfirmation}
                role="status"
                aria-live="polite"
                className={cn(
                  "transition-[opacity,scale] duration-dta-section ease-dta-premium motion-reduce:transition-none",
                  !showConfirmation &&
                    "pointer-events-none absolute inset-x-0 top-0 scale-[0.99] opacity-0 motion-reduce:scale-100",
                )}
              >
                {booked ? (
                  <>
                    <p className={sectionLabelClassName}>Confirmation</p>
                    <p className="mt-dta-sm font-heading text-lg font-semibold leading-[1.25] sm:text-[1.1875rem] tracking-[-0.02em] text-dta-text-primary sm:whitespace-nowrap">
                      You&apos;re booked with {booked.tutorName} at {booked.time}
                    </p>
                    <BookedLocation booked={booked} />
                    <div className="mt-dta-lg flex items-center justify-between gap-dta-sm">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => downloadBookingInvite(booked)}
                        className={cn(OUTLINE_PILL_CLASS, "!h-11 text-[15px]")}
                      >
                        <CalendarPlusIcon className="size-4" aria-hidden />
                        Add to Calendar
                      </Button>
                      <Dialog.Close
                        render={
                          <Button
                            size="lg"
                            className={cn(PRIMARY_PILL_CLASS, "!h-11 text-[15px]")}
                          />
                        }
                      >
                        Done
                      </Dialog.Close>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Keeps the end time and AM/PM together when the row header wraps on narrow screens. */
function RangeLabel({ label }: { label: string }) {
  const [from, to] = label.split(" – ");
  if (!to) return label;
  return (
    <>
      {from} – <span className="whitespace-nowrap">{to}</span>
    </>
  );
}

/** First and last name stack on mobile so both tutor columns line up. */
function TutorName({ name }: { name: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <span className="min-w-0 break-words text-sm font-semibold leading-5 tracking-[-0.01em] text-dta-text-primary sm:text-[15px]">
      <span className="block sm:inline">{first}</span>
      {rest.length ? (
        <>
          {" "}
          <span className="block sm:inline">{rest.join(" ")}</span>
        </>
      ) : null}
    </span>
  );
}

function SlotTable({
  state,
  selectedId,
  onSelect,
}: {
  state: SlotsState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (state.status === "error") {
    return (
      <p className="mt-dta-lg text-sm text-destructive" role="alert">
        {state.error}
      </p>
    );
  }

  const { tutors, slots, dropInLabel } = state.data;
  const rows = [...new Set(slots.map((slot) => slot.start))].sort();
  const loading = state.status === "loading";

  return (
    <div role="radiogroup" aria-label="Time slots" aria-busy={loading} className="mt-dta-lg">
      <table className="-mx-2 w-[calc(100%+1rem)] table-fixed border-separate border-spacing-2">
        <thead>
          <tr>
            <th scope="col" className="w-16 p-0 sm:w-[8.5rem]">
              <span className="sr-only">Time</span>
            </th>
            {tutors.map((tutor) => (
              <th key={tutor.name} scope="col" className="p-0 pb-dta-xs text-left align-bottom">
                <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <Avatar className="size-8 shrink-0 border-0 bg-transparent shadow-none after:border-dta-border sm:size-6">
                    <AvatarImage src={tutor.imageSrc} alt="" width={48} height={48} />
                    <AvatarFallback className="bg-dta-elevated text-[9px] font-semibold text-dta-text-secondary">
                      {tutor.initials}
                    </AvatarFallback>
                  </Avatar>
                  <TutorName name={tutor.name} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((start) => {
            const rowSlots = slots.filter((slot) => slot.start === start);
            const label = rowSlots[0]?.label ?? "";
            return (
              <tr key={start}>
                <th scope="row" className={ROW_HEADER_CLASS}>
                  <RangeLabel label={label} />
                </th>
                {tutors.map((tutor) => {
                  const slot = rowSlots.find((s) => s.tutorName === tutor.name);
                  if (!slot) return <td key={tutor.name} className="p-0" />;
                  if (loading && !slot.taken) {
                    return (
                      <td key={tutor.name} className="p-0">
                        <Skeleton className="h-10 w-full rounded-pill" />
                      </td>
                    );
                  }
                  const selected = slot.id === selectedId;
                  const state = slot.taken ? "taken" : selected ? "selected" : "open";
                  return (
                    <td key={tutor.name} className="p-0">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${tutor.name} at ${label}${slot.taken ? ", taken" : ""}`}
                        disabled={slot.taken}
                        onClick={() => onSelect(slot.id)}
                        className={cn(SLOT_PILL_BASE, SLOT_PILL_STATE[state])}
                      >
                        <span aria-hidden className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
                          <span className={cn(FADE_MOTION, selected ? "scale-95 opacity-0" : "opacity-100")}>
                            {slot.taken ? "Taken" : "Open"}
                          </span>
                          <span className={cn(FADE_MOTION, selected ? "opacity-100" : "scale-95 opacity-0")}>
                            Selected
                          </span>
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <th scope="row" className={ROW_HEADER_CLASS}>
              <RangeLabel label={dropInLabel} />
            </th>
            <td colSpan={tutors.length} className="p-0">
              <span className={cn(SLOT_PILL_BASE, SLOT_PILL_STATE.dropIn)}>
                Drop-In Only
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
