---
name: Dublin Tutoring Association
description: Cinematic dark editorial UI derived from Analysis.md; monochrome base with sparse cool accents and editorial type.
colors:
  bg-base: "#050505"
  bg-raised: "#0B0B0C"
  surface: "#111214"
  surface-elevated: "#17181B"
  text-primary: "#F5F5F7"
  text-secondary: "#B4B4B8"
  text-muted: "#8A8A8E"
  border-subtle: "#262628"
  accent-blue: "#6EA8FF"
  accent-cyan: "#72D6FF"
  accent-purple: "#8B7DFF"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 8vw, 6.875rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.18em"
rounded:
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "32px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "120px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.bg-base}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.04)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    typography: "{typography.title}"
  card-surface:
    backgroundColor: "rgba(255,255,255,0.03)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

# Design System: Dublin Tutoring Association

## Overview

**Creative North Star: "Quiet authority after hours."**

Parents and students often browse tutors in the evening, on one screen, comparing trust signals quickly. This system adapts the Analysis.md (OMX-inspired) language for DTA: **precision, restraint, and premium calm** instead of loud franchise marketing. The surface reads editorial and expensive, not packaged or toy-like. Cool accents suggest clarity and focus (aligned with STEM credibility) without neon gimmicks.

The Analysis source emphasizes monochrome contrast, soft emissive light, and cinematic spacing. For DTA, that translates to **credibility through composition**, not through busy illustration or gradient-heavy hero clichés. PRODUCT.md rejects generic SaaS shells and tutoring-chain visuals; this palette stays dark and minimal but **human-warm in copy and photography choices**, not in rainbow gradients or playful UI chrome.

**Key characteristics:**

- Dark tonal stack (`bg-base` → `surface-elevated`) for depth without busy illustrations.
- Accents used sparingly for CTAs, links, and focal highlights (see Color Frequency Rule).
- Editorial typography (Inter per Analysis and plan.md); hierarchy from scale and weight, not from rainbow fills.
- Motion is atmospheric and short; respect `prefers-reduced-motion` (PRODUCT.md).

## Colors

Palette character: **deep charcoal canvas with ice-cool signal colors** (blue, cyan, purple) reserved for interaction and emphasis.

### Primary

- **Signal Blue** (`#6EA8FF`): Primary CTA outlines, key links, and focus-adjacent highlights. Use where you want the eye to land once per section.

### Secondary

- **Aqua Cyan** (`#72D6FF`): Secondary highlights, subtle glows, and supportive accents (badges, icon strokes). Pairs with radial glow atmosphere in hero backgrounds.

### Tertiary

- **Iris Purple** (`#8B7DFF`): Tertiary emphasis, alternate chart or diagram strokes if data appears later. Do not stack all three accents in one component.

### Neutral

- **Void Base** (`#050505`): Page background root.
- **Lifted Void** (`#0B0B0C`): Alternate section bands and footer grounding.
- **Surface** (`#111214`): Default content panels and sticky regions.
- **Surface Elevated** (`#17181B`): Hover or emphasized panels one step above surface.
- **Text Primary** (`#F5F5F7`): Headlines and primary body (slightly tinted off-white; avoid pure `#FFFFFF` as global fill).
- **Text Secondary** (`#B4B4B8`): Supporting sentences, metadata, nav labels at rest.
- **Text Muted** (`#8A8A8E`): Captions, timestamps, legal footer.
- **Border Subtle** (`#262628`): 1px dividers and card strokes replacing harsh white hairlines.

### Atmosphere (implementation)

- **Surface wash:** vertical fade `linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))` for section transitions.
- **Glow wash:** radial `rgba(114,214,255,0.15)` fading to transparent by 70% for hero depth only, not behind body copy blocks.

### Named rules

**The Color Frequency Rule.** On any viewport, combined accent-filled area (solid fills plus thick strokes) stays roughly **at or below 10%** of visible UI. Monochrome carries the layout; accents answer "what do I do next?"

**The No Rainbow Hero Rule.** Do not combine blue, cyan, and purple in a single headline block or button row. Pick **one** accent per focal component.

## Typography

**Display / UI:** Inter with `system-ui` fallback (per Analysis.md and `plan.md` Google Fonts direction).

**Character:** Cinematic and precise, not playful. Tight negative tracking on large display lines signals confidence; body stays readable for multilingual households (PRODUCT.md).

### Hierarchy

- **Display** (700, `clamp(3.5rem, 8vw, 6.875rem)`, line-height 0.92, letter-spacing -0.05em): Landing hero only; max two lines before subhead.
- **Headline** (600, 32px, line-height 1.2, letter-spacing -0.03em): Section titles (WHY TUTORING, WHAT WE TEACH).
- **Title** (600, 20px): Card titles, navbar emphasis, pull quotes.
- **Body** (400, 16px, line-height 1.65): All paragraph content; cap line length **65–75ch** in layout CSS.
- **Label** (500, 11px, letter-spacing 0.18em, uppercase): Eyebrows and section kicker labels.

### Named rules

**The Restraint Rule.** No more than **five** distinct type sizes on a public page. Decorative sizes break hierarchy and scan speed.

## Elevation

Depth comes from **tonal steps** (bg → surface → elevated) plus **soft emissive glow**, not from heavy drop shadows. Analysis favors `box-shadow: 0 0 40px rgba(110,168,255,0.08)` for rare glow on primary actions or hero ornaments.

### Shadow vocabulary

- **Accent bloom:** `0 0 40px rgba(110,168,255,0.08)` for primary button hover or hero focal orb only.
- **Flat panels:** default cards use border (`border-subtle`) without shadow.

### Named rules

**The Flat Rest Rule.** Cards sit flat at idle. Glow appears for **interaction or hero focal**, not for every grid tile.

## Components

### Buttons

- **Shape:** Pill (`border-radius: 999px`) per Analysis.
- **Primary:** Solid fill `text-primary` background, `bg-base` text, padding **14px 22px**, weight 600. Hover: translateY(-1px), opacity ~0.92; no layout-animation on unrelated properties.
- **Secondary:** `rgba(255,255,255,0.04)` fill, `border-subtle` 1px border, same padding. Hover brightens border toward ~16% white equivalent without adding new shadow layers.

### Cards

- **Default:** Prefer **solid** `surface` or `rgba(255,255,255,0.03)` fill with **1px** `border-subtle` and **radius lg (24px)**. Use backdrop blur only for **mobile Sheet / drawer** (shadcn Sheet per plan), not for every desktop card.

### Navigation

- **Desktop:** Ghost text links; active state uses `text-primary` or thin underline with `accent-blue`.
- **Mobile:** Right Sheet with surface background and standard focus rings for WCAG (PRODUCT.md AA target).

### Chips / badges

- **Subject badges:** Muted treatment: `surface-elevated` fill, `text-secondary`, optional **one** accent dot or left rule **under 2px** (avoid thick side-stripe accent bars on list rows per house rules).

## Do's and Don'ts

**Do**

- Let typography and whitespace carry the premium feel; keep imagery authentic when added (team, Tri-Valley context).
- Use one orchestrated page-load reveal sequence (staggered fade-up) or skip motion entirely on low-power devices; always honor `prefers-reduced-motion`.
- Pair this dark system with **high-contrast text** against surfaces; verify AA on real components.
- Translate Analysis timing: hover **150ms**, card transitions **220ms**, section reveals **500–700ms**, ease `cubic-bezier(0.22, 1, 0.36, 1)`.

**Don't**

- Don't import Analysis **literally** as "AI infrastructure" or GPU metaphors in user-facing copy; keep infrastructure vocabulary internal to this doc only.
- Don't use loud multi-stop gradients behind text for emphasis (no gradient-text tricks).
- Don't default to frosted glass cards across the whole site; solid tonal surfaces read clearer for families skimming on phones.
- Don't reuse identical icon-plus-card grids without varying rhythm (PRODUCT anti-pattern overlap).

---

_Source tokens and motion timings trace to `References/Analysis.md` (OMLX-inspired design.md). Implementation should prefer OKLCH in CSS when the stack allows; hex above satisfies Stitch-style tooling and Tailwind token export._

**Companion implementation file:** `design-tokens.css` at repo root exposes the same values as `--dta-*` CSS variables; see `plan.md` (section **Design tokens & Tailwind wiring**) for Tailwind `theme.extend` mapping after `shadcn init`.
