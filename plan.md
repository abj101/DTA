# Dublin Tutoring Agency (DTA) — Implementation Plan

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel
- **UI Components:** shadcn/ui
- **Scheduling:** Calendly API + custom shadcn picker UI
- **Contact form:** First-party `POST /api/contact` + **Nodemailer** over SMTP (open-source path; no Formspree)
- **Fonts:** Google Fonts

---

## shadcn MCP — Use This Every Time

> ⚠️ **Before building any component, always use the shadcn MCP.**
> The shadcn MCP gives you the correct, up-to-date component code for your exact project configuration. Never copy components from the docs manually — the MCP handles imports, variants, and Tailwind config automatically.
>
> In Claude, connect the **shadcn MCP** from the tools menu, then ask it to add any component you need. Example prompts:
> - *"Add the Button component"*
> - *"Add Card, CardHeader, CardContent, CardFooter"*
> - *"Add Sheet for a mobile drawer nav"*
>
> Run `npx shadcn init` once at project setup, then use the MCP for every individual component from that point forward.

---

## shadcn Install (One-Time)

```bash
npx shadcn@latest init
```

Choose: TypeScript · Tailwind · App Router · `@/components` alias. After init, use the shadcn MCP for all subsequent component additions — do not run `npx shadcn add` manually.

---

## Design tokens & Tailwind wiring

Canonical palette and motion live in **`DESIGN.md`**. Portable CSS variables are in **`design-tokens.css`** at repo root. Wire them in after `shadcn init`.

### 1. Import tokens

Copy or move `design-tokens.css` into the Next app (for example `src/app/design-tokens.css`), then at the **top** of `app/globals.css`:

```css
@import "./design-tokens.css";
```

Keep shadcn-generated `@tailwind base/components/utilities` (v3) or `@import "tailwindcss"` (v4) **after** this import so tokens are available everywhere.

### 2. Map Tailwind theme to `--dta-*` (v3 / `tailwind.config.ts`)

Extend theme so utilities match `DESIGN.md` names. Adjust paths if `content` or config location differs.

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  // ...existing shadcn content paths
  theme: {
    extend: {
      colors: {
        dta: {
          base: "var(--dta-bg-base)",
          raised: "var(--dta-bg-raised)",
          surface: "var(--dta-surface)",
          elevated: "var(--dta-surface-elevated)",
          "text-primary": "var(--dta-text-primary)",
          "text-secondary": "var(--dta-text-secondary)",
          "text-muted": "var(--dta-text-muted)",
          border: "var(--dta-border-subtle)",
          accent: {
            blue: "var(--dta-accent-blue)",
            cyan: "var(--dta-accent-cyan)",
            purple: "var(--dta-accent-purple)",
          },
        },
      },
      borderRadius: {
        "dta-sm": "var(--dta-radius-sm)",
        "dta-md": "var(--dta-radius-md)",
        "dta-lg": "var(--dta-radius-lg)",
        "dta-xl": "var(--dta-radius-xl)",
        pill: "var(--dta-radius-pill)",
      },
      fontFamily: {
        sans: ["var(--dta-font-sans)", "system-ui", "sans-serif"],
      },
      spacing: {
        "dta-xs": "var(--dta-space-xs)",
        "dta-sm": "var(--dta-space-sm)",
        "dta-md": "var(--dta-space-md)",
        "dta-lg": "var(--dta-space-lg)",
        "dta-xl": "var(--dta-space-xl)",
        section: "var(--dta-space-section)",
      },
      transitionTimingFunction: {
        "dta-premium": "var(--dta-ease-premium)",
      },
      transitionDuration: {
        "dta-hover": "var(--dta-duration-hover)",
        "dta-card": "var(--dta-duration-card)",
        "dta-section": "var(--dta-duration-section)",
      },
      boxShadow: {
        "dta-bloom": "var(--dta-shadow-accent-bloom)",
      },
    },
  },
};

export default config;
```

**Usage examples:** `bg-dta-base`, `text-dta-text-secondary`, `border-dta-border`, `rounded-pill`, `text-dta-accent-blue`, `shadow-dta-bloom`, `ease-dta-premium`, `duration-dta-hover`.

### 3. shadcn semantic colors (optional alignment)

shadcn defaults use CSS variables such as `--background` and `--foreground`. After components exist, map those in `globals.css` to DTA tokens so primitives stay on-brand:

```css
:root {
  --background: var(--dta-bg-base);
  --foreground: var(--dta-text-primary);
  --card: var(--dta-surface);
  --card-foreground: var(--dta-text-primary);
  --primary: var(--dta-text-primary);
  --primary-foreground: var(--dta-bg-base);
  --secondary: var(--dta-surface-elevated);
  --muted: var(--dta-text-muted);
  --border: var(--dta-border-subtle);
  --ring: var(--dta-accent-blue);
}
```

Tweak to match the installed shadcn theme template (variable names differ slightly by version).

### 4. Tailwind v4 note

If init yields CSS-first config (`@import "tailwindcss"` plus `@theme`), mirror the same keys inside `@theme { ... }` pointing at the same `var(--dta-*)` values instead of using `tailwind.config.ts`.

### 5. Fonts

Load **Inter** via `next/font/google` in `app/layout.tsx`:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```

Then set `--dta-font-sans` to `var(--font-inter), system-ui, sans-serif` in `globals.css`, or map `fontFamily.sans` to `var(--font-inter)`.

---

## Site Structure

```
/                  → Landing Page
/about             → About Us
/contact           → Contact & Schedule
```

---

## Shared Components

### `<Navbar>`

**shadcn MCP:** Add `Sheet`, `Button`

- Left: "DTA" wordmark as a plain `<Link>`
- Center links: Home · About · Contact — rendered as `<Button variant="ghost">` wrapped in `<Link>`
- Right: "Book Free Session" → `<Button>` linking to `/contact`
- Mobile (≤768px): hamburger icon opens a right-side `<Sheet side="right">` drawer containing the nav links and a close button (`<SheetClose>`)
- Use `<SheetTrigger asChild>` on the hamburger button

### `<Footer>`

No shadcn components required — plain semantic HTML with Tailwind.

- Brand name: "Dublin Tutoring Agency"
- Nav links: Home · About · Contact
- Email: `tutoring.dta@gmail.com` (mailto link)
- Phone: `(925) 549-2176` (tel link)
- Copyright line

---

## Page 1: `/` — Landing Page

### `<Hero>`

**shadcn MCP:** Add `Button`

- Headline line 1: `Private Tutoring`
- Headline line 2: `& College Prep`
- Subheadline: `Grades 6–12 · STEM · English · AP Testing · College Prep`
- Button 1 (primary): `<Button size="lg">Book a Free Session →</Button>` → links to `/contact`
- Button 2 (secondary): `<Button variant="outline" size="lg">Learn More</Button>` → scrolls to next section

### `<ProblemCards>`

**shadcn MCP:** Add `Card`, `CardHeader`, `CardTitle`, `CardContent`

- Section label: `WHY TUTORING?`
- Three `<Card>` components in a responsive grid (1 col mobile, 3 col desktop):
  - `01 — Rising Academic Pressure`
  - `02 — Changing College Landscape`
  - `03 — Ineffective Study Habits`
- Card structure: `<CardHeader>` holds the number + title; `<CardContent>` holds a short supporting sentence (founders to write)

### `<DifferentiatorList>`

**shadcn MCP:** Add `Separator`

- Section label: `WHAT SETS US APART?`
- Headline: `We've been exactly where you are.`
- Four rows, each separated by `<Separator>`:
  - **Real** AP & College Application Experience
  - **Free Office Hours** for Additional Support
  - **10+ Years** of Tutoring across the Bay Area
  - **Personalized Plans** for College Readiness

### `<SubjectGrid>`

**shadcn MCP:** Add `Badge`

- Section label: `WHAT WE TEACH`
- Render each subject as `<Badge variant="secondary">` — decorative only, no interactivity, no onClick
- Subjects: Algebra · Geometry · Pre-Calc · Calculus · Biology · Chemistry · Physics · English · AP Courses · College Essays

### `<PricingBlock>`

**shadcn MCP:** Add `Card`, `CardContent`, `Separator`

- Section label: `PRICING`
- Single `<Card>` with two-column interior layout separated by `<Separator orientation="vertical">` (horizontal on mobile):
  - Left: `Starting at $45 / session`
  - Right: `Available in-person (Dublin, CA) and online`
- Subtext below card: `First consultation is always free.`

### `<CTABanner>` (Landing)

**shadcn MCP:** Add `Button`

- Headline: `Ready to get started?`
- Subtext: `Book your free 30-minute consultation — no commitment required.`
- `<Button size="lg">Schedule Now →</Button>` → links to `/contact`

---

## Page 2: `/about` — About Us

### `<AboutHero>`

No shadcn components required — plain heading + paragraph with Tailwind.

- Headline: `Our Story`
- Paragraph: `[FOUNDERS TO WRITE — 2–3 sentences on why DTA was started]`

### `<FounderCards>`

**shadcn MCP:** Add `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Avatar`, `AvatarImage`, `AvatarFallback`

Two `<Card>` components side by side (stacked on mobile via responsive grid):

**Card 1 — Ayush Bakhandi**
- `<Avatar>` with `<AvatarImage>` using `next/image` (explicit `width`, `height`, `alt`) and `<AvatarFallback>AB</AvatarFallback>`
- `<CardTitle>`: Ayush Bakhandi
- `<CardDescription>`: DHS/Athenian '22 · UC Berkeley '25 · B.S. Molecular Environmental Biology
- `<CardContent>`: `[FOUNDER TO WRITE — 3–4 sentences]`

**Card 2 — Ayush Bandopadhyay**
- `<Avatar>` with `<AvatarImage>` using `next/image` (explicit `width`, `height`, `alt`) and `<AvatarFallback>AB</AvatarFallback>`
- `<CardTitle>`: Ayush Bandopadhyay
- `<CardDescription>`: DHS '22 · UC Santa Cruz '26 · B.S. Computer Science & Game Design
- `<CardContent>`: `[FOUNDER TO WRITE — 3–4 sentences]`

### `<ApproachList>`

**shadcn MCP:** Add `Separator`

- Section label: `HOW WE WORK`
- Four numbered rows separated by `<Separator>`:
  - `01 — Personalized learning plans for every student`
  - `02 — Real experience with AP exams and college applications`
  - `03 — Free office hours available between sessions`
  - `04 — Sessions available online and in-person in Dublin, CA`

### `<CTABanner>` (About)

**shadcn MCP:** Add `Button`

- Headline: `Want to meet us first?`
- `<Button size="lg">Book a Free Consultation →</Button>` → links to `/contact`

---

## Page 3: `/contact` — Contact & Schedule

### `<ContactHero>`

No shadcn components required — plain heading + paragraph with Tailwind.

- Headline: `Let's Talk`
- Subtext: `Book a free 30-minute consultation or send us a message.`

### `<AppointmentPicker>`

**shadcn MCP:** Add `Calendar`, `Button`, `Badge`, `Skeleton`

- Section label: `BOOK A FREE SESSION`
- Custom shadcn UI — no Calendly embed widget
- Two-column layout: `Calendar` on the left, time slot grid on the right (stacked on mobile)
- On date select → fetches available slots from `/api/availability`
- Slots displayed as `<Button variant="outline">` pills; selected slot switches to `<Button variant="default">`
- Loading state: 6× `<Skeleton className="h-10 w-full">` placeholders
- Selected slot confirmation shown as `<Badge variant="secondary">`
- On confirm → `window.open()` to Calendly hosted booking URL with slot pre-filled
- See **Calendly API — Implementation Guide** section below for full code

### `<ContactInfo>`

**shadcn MCP:** Add `Button`

- Email: `tutoring.dta@gmail.com` → `<Button variant="ghost" asChild><a href="mailto:...">`
- Phone: `(925) 549-2176` → `<Button variant="ghost" asChild><a href="tel:...">`
- Location: `Dublin, CA · Available Online` — plain text

### `<MessageForm>`

**shadcn MCP:** Add `Input`, `Textarea`, `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, `Label`, `Button`

- Section label: `SEND A MESSAGE`
- Fields, each wrapped in a `<Label>` + component pair:
  - Name → `<Input type="text" />`
  - Email → `<Input type="email" />`
  - Grade level → `<Select>` with `<SelectItem>` for 6th–12th
  - Subject of interest → `<Select>` with `<SelectItem>` for Math · Science · English · AP Courses · College Prep · Other
  - Message → `<Textarea rows={5} />`
  - Submit → `<Button type="submit">Send Message →</Button>`
- Client posts JSON to **`POST /api/contact`** (same-origin). Server validates with **Zod**, sends mail via **Nodemailer** using **server-only SMTP env vars** (see **Contact form — SMTP** below). Includes an optional honeypot field (`website`) kept visually hidden; non-empty submissions are rejected.
- On success: replace form with an inline `<p>` confirmation: *"Thanks! We'll be in touch soon."* — no redirect

---

## Component Index

| Component | Page | Key shadcn Components |
|---|---|---|
| `<Navbar>` | All | `Sheet`, `Button` |
| `<Footer>` | All | — |
| `<Hero>` | Landing | `Button` |
| `<ProblemCards>` | Landing | `Card`, `CardHeader`, `CardTitle`, `CardContent` |
| `<DifferentiatorList>` | Landing | `Separator` |
| `<SubjectGrid>` | Landing | `Badge` |
| `<PricingBlock>` | Landing | `Card`, `CardContent`, `Separator` |
| `<CTABanner>` | Landing, About | `Button` |
| `<AboutHero>` | About | — |
| `<FounderCards>` | About | `Card`, `Avatar`, `AvatarImage`, `AvatarFallback` |
| `<ApproachList>` | About | `Separator` |
| `<ContactHero>` | Contact | — |
| `<AppointmentPicker>` | Contact | `Calendar`, `Button`, `Badge`, `Skeleton` |
| `<ContactInfo>` | Contact | `Button` |
| `<MessageForm>` | Contact | `Input`, `Textarea`, `Select`, `Label`, `Button` |

> ⚠️ **Reminder:** Use the shadcn MCP to add every component in the table above. Do not hand-write or copy-paste component source from the docs.

---

## Build Order

1. Init Next.js project, deploy to Vercel — run `npx shadcn@latest init`
2. Add Google Fonts, `<head>` metadata (title, description, OG tags), and Vercel Analytics to `layout.tsx`
3. **shadcn MCP → add `Sheet`, `Button`** → build `<Navbar>` (with mobile drawer) and `<Footer>`
4. **shadcn MCP → add `Card`, `Separator`, `Badge`** → build Landing Page top to bottom
5. **shadcn MCP → add `Avatar`, `AvatarImage`, `AvatarFallback`** → build About Page top to bottom
6. **shadcn MCP → add `Calendar`, `Skeleton`, `Input`, `Textarea`, `Select`, `Label`** → build Contact Page: `<AppointmentPicker>`, wire `/api/availability`, wire **`POST /api/contact`** + SMTP for `<MessageForm>`
7. Mobile responsiveness pass across all pages
8. Add `not-found.tsx` — branded 404 page with site nav, footer, and link back to home

---

## Calendly API — Implementation Guide

### Overview

The appointment picker calls the Calendly API server-side to fetch available time slots, displays them in a custom shadcn UI, and redirects the user to Calendly's hosted booking page with the chosen slot pre-selected. Calendly handles confirmation emails and calendar writes. No OAuth required — a single personal API token is sufficient.

---

### Step 1 — Calendly Account Setup

1. Go to [calendly.com](https://calendly.com) and create an account using the founders' Gmail
2. Create a new event type: **"Free Consultation"**, 30 minutes, set available hours (e.g. weekdays 3pm–7pm)
3. Go to **Integrations → API & Webhooks → Personal Access Tokens**
4. Generate a token and save it — you will not be able to see it again
5. Call the API once to retrieve your event type UUID:

```bash
curl https://api.calendly.com/event_types \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

From the response, copy the `uri` of your "Free Consultation" event:
`https://api.calendly.com/event_types/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

The UUID is the last segment. Save it.

---

### Step 2 — Environment Variables

Add to `.env.local` (local) and Vercel project settings (production):

```
CALENDLY_API_TOKEN=your_personal_access_token_here
CALENDLY_EVENT_TYPE_UUID=your_event_type_uuid_here
NEXT_PUBLIC_CALENDLY_USERNAME=dtutoring
NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG=free-consultation
```

`NEXT_PUBLIC_` vars are safe to expose — they're just your public Calendly username and slug.

---

### Step 3 — shadcn Components

> ⚠️ **Use the shadcn MCP** to add all components before writing the picker code.
> Ask the MCP: *"Add Calendar, Button, Badge, Skeleton"*

---

### Step 4 — API Route: `/api/availability`

Create `app/api/availability/route.ts`. Receives a `date` query param, calls Calendly's `event_type_available_times` endpoint, returns available slot times.

```ts
// app/api/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') // "YYYY-MM-DD"

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const startTime    = new Date(`${date}T00:00:00.000Z`).toISOString()
  const endTime      = new Date(`${date}T23:59:59.000Z`).toISOString()
  const eventTypeUri = `https://api.calendly.com/event_types/${process.env.CALENDLY_EVENT_TYPE_UUID}`

  const res = await fetch(
    `https://api.calendly.com/event_type_available_times` +
    `?event_type=${encodeURIComponent(eventTypeUri)}` +
    `&start_time=${startTime}&end_time=${endTime}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CALENDLY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Calendly API error' }, { status: 500 })
  }

  const data  = await res.json()
  const slots = data.collection.map((s: { start_time: string }) => s.start_time)

  return NextResponse.json({ slots })
}
```

**Sample response:**

```json
{
  "slots": [
    "2024-09-15T15:00:00.000000Z",
    "2024-09-15T15:30:00.000000Z",
    "2024-09-15T16:00:00.000000Z"
  ]
}
```

---

### Step 5 — Component: `<AppointmentPicker>`

> ⚠️ **Use the shadcn MCP** to add `Calendar`, `Button`, `Badge`, `Skeleton` before writing this file.

Create `components/AppointmentPicker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

function formatSlot(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Los_Angeles',
  })
}

function buildCalendlyUrl(slotIso: string) {
  const base    = `https://calendly.com/${process.env.NEXT_PUBLIC_CALENDLY_USERNAME}/${process.env.NEXT_PUBLIC_CALENDLY_EVENT_TYPE_SLUG}`
  const encoded = encodeURIComponent(slotIso)
  return `${base}?date=${encoded}`
}

export default function AppointmentPicker() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [slots, setSlots]               = useState<string[]>([])
  const [loading, setLoading]           = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  async function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setSelectedDate(date)
    setSelectedSlot(null)
    setLoading(true)

    const iso  = date.toISOString().split('T')[0]
    const res  = await fetch(`/api/availability?date=${iso}`)
    const data = await res.json()

    setSlots(data.slots ?? [])
    setLoading(false)
  }

  function handleBook() {
    if (!selectedSlot) return
    window.open(buildCalendlyUrl(selectedSlot), '_blank')
  }

  function isDisabled(date: Date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const day = date.getDay()
    return date < today || day === 0 || day === 6
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div>
        <p className="text-sm text-muted-foreground mb-3">Select a date</p>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={isDisabled}
        />
      </div>

      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-3">
          {selectedDate ? 'Available times' : 'Pick a date to see times'}
        </p>

        {loading && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        )}

        {!loading && slots.length === 0 && selectedDate && (
          <p className="text-sm text-muted-foreground">No availability on this date.</p>
        )}

        {!loading && slots.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => (
              <Button
                key={slot}
                variant={selectedSlot === slot ? 'default' : 'outline'}
                onClick={() => setSelectedSlot(slot)}
              >
                {formatSlot(slot)}
              </Button>
            ))}
          </div>
        )}

        {selectedSlot && (
          <div className="mt-6">
            <Badge variant="secondary" className="mb-3">
              {formatSlot(selectedSlot)} selected
            </Badge>
            <br />
            <Button onClick={handleBook} className="w-full md:w-auto">
              Confirm & Book on Calendly →
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              You'll complete your booking on Calendly. Free, no commitment.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### Step 6 — Wire into the Contact Page

```tsx
// app/contact/page.tsx (relevant section)
import AppointmentPicker from '@/components/AppointmentPicker'

export default function ContactPage() {
  return (
    <main>
      <section>
        <p className="section-label">BOOK A FREE SESSION</p>
        <AppointmentPicker />
      </section>
      {/* ContactInfo, MessageForm below */}
    </main>
  )
}
```

---

### Data Flow Summary

```
User picks date
      ↓
AppointmentPicker → GET /api/availability?date=YYYY-MM-DD
                              ↓
                   Calendly API: event_type_available_times
                              ↓
                   Returns [ "2024-09-15T15:00:00Z", ... ]
                              ↓
User picks slot → window.open(calendly.com/dtutoring/free-consultation?date=...)
                              ↓
                   Calendly hosted page — user enters name/email, confirms
                              ↓
                   Calendly sends confirmation email + writes to Google Calendar
```

---

### Gotchas

- **Timezone:** Calendly returns slots in UTC. Always convert to `America/Los_Angeles` for display. The `formatSlot` helper above handles this.
- **Weekends:** Disable in the `Calendar` `disabled` prop — avoids a needless API round-trip.
- **API rate limits:** Calendly free tier allows 600 requests/hour. One call per date selection — not a concern.
- **Calendly free tier:** Supports one event type. The `event_type_available_times` endpoint is available on the free plan.

---

## Contact form — SMTP (`POST /api/contact`)

The contact form does **not** use a third-party form host. The browser sends JSON to **`app/api/contact/route.ts`**, which validates the payload and sends email through **Nodemailer** (MIT license).

### Environment variables

Add to `.env.local` (local) and Vercel (production). **Do not** prefix these with `NEXT_PUBLIC_`; they must stay server-only.

| Variable | Required | Notes |
|----------|----------|--------|
| `SMTP_HOST` | Yes | e.g. `smtp.gmail.com`, Amazon SES SMTP endpoint, Mailtrap host |
| `SMTP_PORT` | No | Default **`587`**. Use **`465`** with `SMTP_SECURE=true` if your provider requires implicit SSL |
| `SMTP_SECURE` | No | Set to **`true`** or **`1`** for SSL on port 465 |
| `SMTP_USER` | Usually | SMTP username (often the mailbox email) |
| `SMTP_PASS` | Usually | SMTP password or app-specific password |
| `CONTACT_TO_EMAIL` | Yes | Recipient inbox (e.g. `tutoring.dta@gmail.com`) |
| `CONTACT_FROM` | No | Sender address your provider accepts; defaults to **`SMTP_USER`** if omitted |

If required SMTP variables are missing, the route responds with **503** and a generic configuration message.

### Operational notes

- **Gmail / Google Workspace:** Prefer an **App Password** or Workspace SMTP relay; avoid storing a raw account password in env when 2FA is enabled.
- **Development:** Use [Mailtrap](https://mailtrap.io) or similar SMTP sandbox to capture messages without hitting a real inbox.
- **Spam:** The UI includes a honeypot field; stronger measures (CAPTCHA, rate limiting) can be added later if needed.

See **`dta-app/.env.example`** for a copy-paste template alongside Calendly vars.

---

## Image Handling

All images must use `next/image` with explicit `width`, `height`, and `alt` props. Applies to founder photos in `<FounderCards>` and any other images added during build. Never use a plain `<img>` tag.

---

## Pre-Build Requirements (Founders)

- [ ] Create Calendly account → set up "Free Consultation" 30-min event → set available hours
- [ ] Generate Calendly personal API token → save securely
- [ ] Call `GET /event_types` once to retrieve event type UUID → save for env vars
- [ ] Add all env vars to `.env.local` and Vercel project settings (see Calendly API section)
- [ ] Configure SMTP + contact env vars for `POST /api/contact` (see **Contact form — SMTP** above and `dta-app/.env.example`)
- [ ] Write "Our Story" paragraph (2–3 sentences)
- [ ] Write each tutor bio (3–4 sentences each)
- [ ] Prepare founder photos (high res, square or portrait)
- [ ] Register domain and connect to Vercel