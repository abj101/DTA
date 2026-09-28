import type { ReactNode } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { OfficeHoursSignup } from "@/components/office-hours/signup-dialog";
import { Separator } from "@/components/ui/separator";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
} from "@/lib/contact";
import {
  formatOfficeDate,
  formatOfficeTimeRange,
  mapsSearchHref,
  type OfficeHoursResult,
  type OfficeHoursSession,
  type OfficeHoursTutor,
} from "@/lib/office-hours";
import { buildSlotsView, signupsConfigured } from "@/lib/office-hours-signups";

const CONTACT_LINK_CLASS =
  "inline-flex items-center py-1 text-[15px] leading-normal text-dta-text-secondary underline decoration-dta-border underline-offset-[5px] transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-primary md:text-base";

function TutorPanel({
  tutors,
  headingId,
  action,
}: {
  tutors: OfficeHoursTutor[];
  headingId: string;
  action?: ReactNode;
}) {
  if (tutors.length === 0) return null;

  return (
    <aside className="col-start-2 row-start-1 w-max max-w-full min-w-0 self-start justify-self-end">
      <p
        id={headingId}
        className="text-[15px] font-medium text-dta-text-secondary md:text-base"
      >
        Available Tutors
      </p>
      <ul className="mt-dta-sm list-none p-0" aria-labelledby={headingId}>
        {tutors.map((tutor) => (
          <li
            key={tutor.name}
            className="flex min-w-0 items-center gap-2 not-first:mt-4"
          >
            <Avatar
              className="size-8 shrink-0 border-0 bg-transparent shadow-none after:border-dta-border"
            >
              <AvatarImage src={tutor.imageSrc} alt="" width={64} height={64} />
              <AvatarFallback className="bg-dta-elevated text-[10px] font-semibold text-dta-text-secondary">
                {tutor.initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 break-words text-[15px] font-medium leading-6 text-dta-text-primary md:text-base">
              {tutor.name}
            </span>
          </li>
        ))}
      </ul>
      {action}
    </aside>
  );
}

function SessionBlock({
  kicker,
  kickerId,
  tutors,
  tutorsHeadingId,
  tutorsAction,
  labelledBy,
  happeningNow,
  children,
}: {
  kicker: string;
  kickerId?: string;
  tutors: OfficeHoursTutor[];
  tutorsHeadingId: string;
  tutorsAction?: ReactNode;
  labelledBy: string;
  happeningNow?: boolean;
  children: ReactNode;
}) {
  return (
    <article aria-labelledby={labelledBy}>
      {happeningNow ? (
        <p className="mb-dta-sm inline-flex rounded-pill border border-dta-status-border bg-dta-status-surface px-2.5 py-0.5 text-[12px] font-medium text-dta-status-text">
          Happening now
        </p>
      ) : null}
      <div
        className={
          tutors.length > 0
            ? "grid grid-cols-[minmax(0,1fr)_minmax(10.75rem,max-content)] items-start gap-x-dta-md sm:gap-x-dta-lg"
            : undefined
        }
      >
        <div className="min-w-0">
          <p
            id={kickerId}
            className="text-[15px] font-medium text-dta-text-secondary md:text-base"
          >
            {kicker}
          </p>
          <div className="mt-dta-sm">{children}</div>
        </div>
        <TutorPanel
          tutors={tutors}
          headingId={tutorsHeadingId}
          action={tutorsAction}
        />
      </div>
    </article>
  );
}

function Fallback({
  headline,
  body,
}: {
  headline: string;
  body: string;
}) {
  return (
    <div className="border-t border-dta-border pt-dta-lg">
      <p className="font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
        {headline}
      </p>
      <p className="mt-dta-md max-w-[62ch] text-[15px] leading-[1.7] text-dta-text-secondary md:text-base">
        {body}{" "}
        <Link href={CONTACT_EMAIL_HREF} className={CONTACT_LINK_CLASS}>
          {CONTACT_EMAIL}
        </Link>
      </p>
    </div>
  );
}

function sessionWhen(session: OfficeHoursSession) {
  const start = new Date(session.start);
  const end = new Date(session.end);
  return {
    date: formatOfficeDate(start),
    time: formatOfficeTimeRange(start, end),
  };
}

function SessionLocation({ session }: { session: OfficeHoursSession }) {
  const mapsHref =
    session.mapsQuery && session.address
      ? mapsSearchHref(session.mapsQuery)
      : null;

  const pin = (
    <MapPin
      className="size-[1em] shrink-0 text-dta-text-muted"
      strokeWidth={2}
      aria-hidden
    />
  );

  return (
    <p className="mt-dta-md flex min-w-0 items-start gap-2 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-dta-text-primary md:text-[18px]">
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[0.2em] shrink-0 transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-secondary"
          aria-label={`Open ${session.venue} in maps`}
        >
          {pin}
        </a>
      ) : (
        <span className="mt-[0.2em] shrink-0">{pin}</span>
      )}
      <span className="min-w-0 break-words">
        {session.venue}
        {session.address && mapsHref ? (
          <span className="font-medium text-dta-text-muted">
            {" "}
            ·{" "}
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dta-border underline-offset-[5px] transition-colors duration-dta-hover ease-dta-premium hover:text-dta-text-secondary"
            >
              {session.address}
            </a>
          </span>
        ) : session.address ? (
          <span className="font-medium text-dta-text-muted">
            {" "}
            · {session.address}
          </span>
        ) : null}
      </span>
    </p>
  );
}

function NextUp({
  session,
  kicker,
}: {
  session: OfficeHoursSession;
  kicker: string;
}) {
  const { date, time } = sessionWhen(session);

  return (
    <SessionBlock
      kicker={kicker}
      tutors={session.tutors}
      tutorsHeadingId="office-hours-available-tutors"
      tutorsAction={
        session.tutors.length > 0 && signupsConfigured() ? (
          <OfficeHoursSignup initial={buildSlotsView(session, new Set())} />
        ) : undefined
      }
      labelledBy="office-hours-next-when"
      happeningNow={session.happeningNow}
    >
      <h2
        id="office-hours-next-when"
        className="font-heading tracking-[-0.03em] text-dta-text-primary"
      >
        <span className="block text-[clamp(1.75rem,5vw,2.75rem)] font-semibold sm:leading-[1.15]">
          {date}
        </span>
        <span className="mt-dta-sm block text-[clamp(1.125rem,2.4vw,1.5rem)] font-semibold tracking-[-0.02em]">
          {time}
        </span>
      </h2>
      <SessionLocation session={session} />
    </SessionBlock>
  );
}

function NextWeekBlock({ session }: { session: OfficeHoursSession }) {
  const { date, time } = sessionWhen(session);

  return (
    <SessionBlock
      kicker="Next Week"
      kickerId="office-hours-next-week"
      tutors={session.tutors}
      tutorsHeadingId="office-hours-next-week-available-tutors"
      labelledBy="office-hours-next-week"
    >
      <p className="font-heading text-[clamp(1.25rem,2.6vw,1.5rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-dta-text-primary">
        {date}
      </p>
      <p className="mt-dta-xs text-[15px] font-medium text-dta-text-primary md:text-base">
        {time}
      </p>
      <SessionLocation session={session} />
    </SessionBlock>
  );
}

export function OfficeHoursModule({ data }: { data: OfficeHoursResult }) {
  if (data.status === "static") {
    return (
      <Fallback
        headline="Schedule lives on the live site"
        body="This preview cannot load the calendar. Email us for the next drop-in window:"
      />
    );
  }

  if (data.status === "error") {
    return (
      <Fallback
        headline="Schedule unavailable"
        body="We could not load office hours right now. Email us and we will send the next window:"
      />
    );
  }

  if (data.status === "empty") {
    return (
      <Fallback
        headline="No office hours on the calendar right now"
        body="Check back soon, or email us:"
      />
    );
  }

  const hero = data.thisWeek;
  const nextWeek = data.nextWeek;

  return (
    <div className="border-t border-dta-border pt-dta-lg">
      {hero ? (
        <NextUp session={hero} kicker={hero.title} />
      ) : nextWeek ? (
        <NextUp session={nextWeek} kicker="Next Week" />
      ) : null}

      {hero && nextWeek ? (
        <>
          <Separator className="my-dta-lg bg-dta-border" />
          <NextWeekBlock session={nextWeek} />
        </>
      ) : null}
    </div>
  );
}
