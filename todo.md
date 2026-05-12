# DTA — Agent runbook (`todo.md`)

Execute top to bottom. Only check a box after its **Verify** line passes.

---

## Non-negotiable sources

| Source | Role |
|--------|------|
| [plan.md](./plan.md) | Build order, component copy/specs, Calendly + contact SMTP wiring, API snippets |
| [DESIGN.md](./DESIGN.md) | Semantic colors, type scale, motion, component recipes, brand rules |
| [design-tokens.css](./design-tokens.css) | `--dta-*` CSS variables — import path + Tailwind mapping: see `plan.md` §Design tokens |

**Typography:** Shipped UI follows **DESIGN.md** + **plan.md** (Inter via `next/font`). If using [.agents/skills/frontend-design](./.agents/skills/frontend-design/SKILL.md) for a deliberate alternate look, update tokens / `DESIGN.md` notes so agents stay aligned.

---

## Global rules (always)

1. **shadcn MCP** (`project-0-DTA-shadcn`): Before adding UI primitives, use MCP — `list_items_in_registries`, `search_items_in_registries`, `get_add_command_for_items`, `get_audit_checklist`. Never paste shadcn source from generic docs; match project registries.
2. **Skills:** Read [.agents/skills/frontend-design/SKILL.md](./.agents/skills/frontend-design/SKILL.md) when building new pages, layouts, or section-level UI. Read [.agents/skills/impeccable/SKILL.md](./.agents/skills/impeccable/SKILL.md) on polish passes (hierarchy, a11y, responsive edge cases, cognitive load).
3. **Tokens first:** Components use `var(--dta-*)` / Tailwind `dta-*` utilities after wiring in `plan.md`. Map shadcn semantic vars (`--background`, `--foreground`, etc.) to DTA tokens per `plan.md` §3.
4. **Images:** `next/image` only, explicit `width`, `height`, `alt` ([plan.md](./plan.md) Image Handling).

---

## Design iteration (repeat after each major page or section)

1. Implement per [plan.md](./plan.md) using tokens + shadcn MCP.
2. **Impeccable pass** — spacing, type hierarchy, focus states, breakpoints (skill: impeccable).
3. **Frontend-design pass** — only if layout feels generic or new pattern needs a strong concept; stay consistent with DESIGN.md (skill: frontend-design).
4. **Verify** — lint + build + targeted browser check (see phase Verify lines).
5. Adjust until Verify clean.

---

## Phase 0 — Bootstrap

**Prereqs:** Node + package manager. Human ops items below for Calendly/SMTP can stay pending until Contact phase.

**App root:** Next.js app lives in [`dta-app/`](./dta-app/) — run `npm run lint` / `npm run build` / `npm run dev` from `dta-app`. Open MCP / shadcn from that directory or ensure `components.json` resolves there.

- [x] **MCP:** `get_project_registries` — confirm shadcn project path matches repo app root (`dta-app/components.json`).
- [x] Scaffold Next.js (App Router), TypeScript, Tailwind — align with `plan.md` Tech Stack (`dta-app/`).
- [x] Run `npx shadcn@latest init` once (TypeScript · Tailwind · App Router · `@/components`). Do **not** use `npx shadcn add` for individual components — use MCP after init.
- [x] Copy or symlink [design-tokens.css](./design-tokens.css) into app (e.g. `src/app/design-tokens.css`); `@import` at **top** of `globals.css`, Tailwind layers **after** (`plan.md` §Import tokens).
- [x] Extend Tailwind theme with `dta` colors, radii, spacing, motion, shadows per `plan.md` (v3 `tailwind.config.ts` **or** v4 `@theme` — match what init produced).
- [x] Map shadcn `--background`, `--foreground`, `--card`, `--primary`, etc. to `--dta-*` in `globals.css` (`plan.md` §shadcn semantic colors).
- [x] Load Inter via `next/font/google` in `layout.tsx`; wire `--dta-font-sans` or `fontFamily.sans` (`plan.md` §Fonts).
- [x] Metadata: title, description, OG tags in `layout.tsx` or metadata API; add Vercel Analytics if in stack (`plan.md` Build Order step 2).

**Verify:** `pnpm lint` (or `npm run lint`) and `pnpm build` succeed. No console errors on dev root.

---

## Phase 1 — Shell (`<Navbar>`, `<Footer>`)

**MCP (before coding):** add `Sheet`, `Button` via shadcn MCP.

- [x] `<Navbar>` — wordmark `Link`, ghost buttons for nav, primary CTA to `/contact`, `Sheet` mobile drawer ≤768px (`plan.md` Shared Components).
- [x] `<Footer>` — semantic HTML + Tailwind; email `tutoring.dta@gmail.com`, phone `(925) 549-2176`, copyright (`plan.md`).
- [x] Wrap pages with shell when routes exist.

**Skill:** impeccable — keyboard trap in Sheet, focus return.

**Verify:** Lint + build. Manual: 375 / 768 / 1280 — nav usable, Sheet opens/closes, all links work.

---

## Phase 2 — Landing `/`

**MCP (incremental):** `Button` → `Card`, `CardHeader`, `CardTitle`, `CardContent` → `Separator` → `Badge` → `Card`, `CardContent`, `Separator` again as needed per Component Index.

**Skill:** frontend-design for first full-page composition; impeccable before marking done.

- [x] `<Hero>` — headlines, subhead, primary + secondary CTAs (`plan.md` Page 1 Hero).
- [x] `<ProblemCards>` — section label + 3 cards grid (`plan.md`).
- [x] `<DifferentiatorList>` — label, headline, 4 rows + `Separator`.
- [x] `<SubjectGrid>` — `Badge` grid, decorative only.
- [x] `<PricingBlock>` — card, pricing copy, separator desktop/mobile.
- [x] `<CTABanner>` — CTA to `/contact`.
- [x] Compose `app/page.tsx` with sections in order.

**Verify:** Lint + build. Manual scroll + hover states; DESIGN.md accent frequency (sparse accents).

---

## Phase 3 — About `/about`

**MCP:** `Avatar`, `AvatarImage`, `AvatarFallback` (+ Card pieces if not already).

- [x] `<AboutHero>` — Our Story + founder placeholder copy (`plan.md`).
- [x] `<FounderCards>` — two cards, `Avatar` + `AvatarImage` (192×192 + `alt`), bios placeholders (`plan.md` names + education lines).
- [x] `<ApproachList>` — HOW WE WORK, four rows + `Separator`.
- [x] `<CTABanner>` (About variant) → `/contact`.
- [x] `app/about/page.tsx`.

**Verify:** Lint + build. Images: dimensions + alt set.

---

## Phase 4 — Contact `/contact` + API

**Prereqs:** `.env.local` per `plan.md` (Calendly token, event UUID, public Calendly slug/username); SMTP + contact inbox vars for `/api/contact` when form goes live (`plan.md` Contact form — SMTP).

**MCP:** `Calendar`, `Skeleton`, `Input`, `Textarea`, `Select`, `Label`, `Button`, `Badge` — confirm all present via MCP before picker + form.

- [x] `app/api/availability/route.ts` — GET `date` query, Calendly `event_type_available_times`, return `{ slots }` (`plan.md` Calendly API).
- [x] `<AppointmentPicker>` — calendar + slot pills + skeleton loading + Confirm opens Calendly URL; timezone `America/Los_Angeles`; weekends disabled (`plan.md` Gotchas).
- [x] `<ContactInfo>` — mailto / tel as ghost buttons.
- [x] `<MessageForm>` — labels, selects, `POST /api/contact` + SMTP (see `plan.md`), success inline message (`plan.md`).
- [x] `<ContactHero>` + `app/contact/page.tsx` assembly.

**Testing (when test runner exists):** Unit or integration test for `/api/availability` with mocked `fetch` and env — otherwise manual `curl`/browser GET with valid date.

**Verify:** Lint + build. GET `/api/availability?date=YYYY-MM-DD` returns JSON (200 or documented error). POST `/api/contact` returns JSON (`503` until SMTP configured; `200` + `{ ok: true }` when mail sends). Form submits without console errors.

---

## Phase 5 — Cross-cutting

- [x] Responsive pass all routes (`plan.md` Build Order 7).
- [x] `app/not-found.tsx` — branded 404, nav/footer or link home (`plan.md` Build Order 8).
- [ ] Token/theme regression: after any `design-tokens.css` or Tailwind theme edit, smoke `/`, `/about`, `/contact`.

**Verify:** Lint + build. All three routes at 375 / 768 / 1280.

---

## Quality gates (ongoing)

| Gate | When |
|------|------|
| `pnpm lint` | After meaningful edits each phase |
| `pnpm build` | Before checking phase complete |
| API | `/api/availability` tested with mock or real env |
| UI manual | Keyboard: tab order, focus visible, Sheet ESC; forms: labels tied to inputs |
| Optional E2E | Playwright or MCP browser on `/`, `/about`, `/contact` when added to repo |
| Token change | Re-smoke all pages |

**Future:** Add Vitest (or similar) for route handlers; Playwright for critical paths — then add scripts to `package.json` and repeat commands here.

---

## Human / ops (blocks env-dependent work)

From [plan.md — Pre-Build Requirements (Founders)](./plan.md):

- [ ] Create Calendly account → "Free Consultation" 30-min event → available hours
- [ ] Generate Calendly personal API token → store securely
- [ ] `GET /event_types` once → save event type UUID for env
- [ ] Add env vars to `.env.local` and Vercel (`plan.md` Calendly section)
- [ ] SMTP inbox for contact form → set env vars per `dta-app/.env.example` and `plan.md` Contact form — SMTP
- [ ] Write "Our Story" paragraph (2–3 sentences)
- [ ] Write each tutor bio (3–4 sentences each)
- [ ] Founder photos (high res, square or portrait) for `<FounderCards>`
- [ ] Register domain → connect to Vercel

---

## Component index (shadcn via MCP)

| Component | Route | shadcn |
|-----------|-------|--------|
| `<Navbar>` | all | Sheet, Button |
| `<Footer>` | all | — |
| `<Hero>` | `/` | Button |
| `<ProblemCards>` | `/` | Card, CardHeader, CardTitle, CardContent |
| `<DifferentiatorList>` | `/` | Separator |
| `<SubjectGrid>` | `/` | Badge |
| `<PricingBlock>` | `/` | Card, CardContent, Separator |
| `<CTABanner>` | `/`, `/about` | Button |
| `<AboutHero>` | `/about` | — |
| `<FounderCards>` | `/about` | Card, Avatar, AvatarImage, AvatarFallback |
| `<ApproachList>` | `/about` | Separator |
| `<ContactHero>` | `/contact` | — |
| `<AppointmentPicker>` | `/contact` | Calendar, Button, Badge, Skeleton |
| `<ContactInfo>` | `/contact` | Button |
| `<MessageForm>` | `/contact` | Input, Textarea, Select, Label, Button |

---

_End of runbook. Single source for agent order-of-operations; detailed prose stays in [plan.md](./plan.md)._
