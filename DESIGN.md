---
name: Dublin Tutoring Association
description: >-
  Editorial tutoring brand on a minimal marketing shell. Color, spacing, radius, and motion
  cadence match measured tokens from https://omlx.ai/ (inline CSS). Voice and structure still
  follow References/FlierReference.png; serif accent and inverse bands are DTA-specific overlays.
source_landing_reference: "https://omlx.ai/"
colors:
  bg-base: "#FFFFFF"
  bg-raised: "#F7F6F3"
  bg-soft: "#F0EEEA"
  surface: "#FFFFFF"
  surface-elevated: "#F7F6F3"
  text-primary: "#141312"
  text-secondary: "#5A5750"
  text-muted: "#9E9B94"
  text-strong: "#2A2825"
  border-subtle: "#E2DFD8"
  inverse-bg: "#141312"
  inverse-bg-accent: "#1A1A1A"
  inverse-text: "#FFFFFF"
  inverse-muted: "#888888"
  accent-status-surface: "#F0FAF5"
  accent-status-border: "#C0E8D0"
  accent-status-text: "#1D7A4A"
typography:
  display-sans:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.125rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  display-serif-accent:
    fontFamily: '"Libre Baskerville", Georgia, "Times New Roman", serif'
    fontStyle: italic
    fontWeight: 400
    fontSize: inherit
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.625rem, 4vw, 2.375rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: normal
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.16em"
  eyebrow-mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "40px"
  "3xl": "48px"
  band: "56px"
  section: "100px"
  gutter: "40px"
  gutter-sm: "20px"
  hero-block-start: "160px"
  hero-block-end: "120px"
  nav-height: "60px"
components:
  button-primary:
    backgroundColor: "{colors.inverse-bg}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
    typography: "14px / 500 sans"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    typography: "14px / 400 sans; underline via border-bottom on hairline"
  rule-divider:
    borderTop: "1px solid {colors.border-subtle}"
  numbered-row:
    numberColor: "{colors.text-muted}"
    gapToCopy: "{spacing.md}"
  footer-inverse-band:
    backgroundColor: "{colors.inverse-bg}"
    textColor: "{colors.inverse-text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.band}"
---

# Design system · Dublin Tutoring Association

## North star

**Printed clarity on a screen:** warm structure from the flyer, pace and chrome from a calm product landing. Public copy stays human and specific ([PRODUCT.md](PRODUCT.md)); this file only locks **measurable** surfaces.

**Scene:** A guardian scrolls indoors on a phone after school. High-contrast type, soft neutrals, hairline rules instead of card stacks; emphasis bands stay rare and purposeful.

## References

| Source | Role |
| --- | --- |
| [References/FlierReference.png](References/FlierReference.png) | Headline pairing, tracked labels, rules, numerals, circular portraits, inverse CTA block. |
| [https://omlx.ai/](https://omlx.ai/) | Measured palette (`:root`), spacing rhythm, radii, mono eyebrows, grid-with-hairlines grammar. Use patterns, not MLX branding or product chrome. |

## Color · from omlx.ai `:root`

Strategy: **restrained** neutrals, near-black for primary actions, one green family for benign chips only.

| Token | Hex | Notes |
| --- | --- | --- |
| Page / surface | `#FFFFFF` | Default canvas (`--white`). |
| Raised wash | `#F7F6F3` | Alternate sections (`--off-white`). |
| Soft ribbon | `#F0EEEA` | Quiet fills (`--gray-100`). |
| Hairlines | `#E2DFD8` | Borders (`--gray-200`). |
| Muted copy | `#9E9B94` | Metadata (`--gray-400`). |
| Secondary copy | `#5A5750` | Supporting text (`--gray-600`). |
| Strong tables | `#2A2825` | Dense UI (`--gray-800`). |
| Ink | `#141312` | Primary text + inverse fill (`--black`). |
| Accent black | `#1A1A1A` | Secondary inverse surfaces (`--accent`). |
| Status fill / stroke / text | `#F0FAF5` / `#C0E8D0` / `#1D7A4A` | Hero badge recipe on omlx (plus `--green`). |
| On-inverse muted | `#888888` | Pull quotes / secondary on charcoal bands (install block pattern). |

Prefer OKLCH in new components when you need interpolation; hex above matches the live reference export.

## Typography

omlx.ai ships **DM Sans** plus **DM Mono** from Google Fonts; DTA currently wires **Inter** and **Libre Baskerville** italic in `layout.tsx` for the flyer clause.

- **Sans:** Inter (swap for DM Sans if you want a closer pixel match to the reference).
- **Serif accent:** Libre Baskerville italic **only** inside the hero clause (flyer lineage).
- **Eyebrows:** Mono cadence (`DM Mono` on omlx); here `eyebrow-mono` token covers section labels.

Hierarchy: display sans (700, fluid clamp), then headline clamp, title 18/600, body 16/400 (cap measure **65 to 75ch**), then uppercase micro labels.

## Layout & spacing

Deduped scale from omlx padding/gaps: **4 · 8 · 16 · 24 · 32 · 40 · 48 · 56 · 100** px, plus **gutter 40** ( **20** mobile), **hero block 160 / 120**, **nav height 60**.

- Default section vertical rhythm: `spacing.section` with gutters; tighten on small screens (omlx uses ~60px block padding at ≤640px).
- Prefer **full-width rules** between ideas over identical card grids ([PRODUCT.md](PRODUCT.md) anti-patterns).

## Radii

`6px` chrome pills · `8px` primary CTA · `12px` framed grids / previews · `16px` emphasized bands · pill `999px` for status badges.

## Elevation & motion

Depth is mostly flat: stepped backgrounds + hairlines. Optional lift shadow mirrors omlx dashboard card: `0 8px 40px rgba(20, 19, 18, 0.12)`.

Motion: hover fades **~150ms**; section reveals **~600 to 800ms** with `cubic-bezier(0.22, 1, 0.36, 1)`. Respect `prefers-reduced-motion`. Do not animate layout-driving properties.

## Components (short)

- **Primary control:** Ink fill, white label, `8px` radius, generous horizontal padding.
- **Quiet control:** Text/link with hairline underline; stays gray600 until hover darkens.
- **Status chip:** Green text on `#F0FAF5`, `1px` `#C0E8D0` border, pill radius.
- **Inverse band:** Charcoal container (`#141312`), white headline, `#888` supporting copy; reserve for pricing / consultation emphasis (flyer footer analogue).

## Guardrails

**Do:** Let numerals, rules, and portraits carry proof; keep one accent family per component; verify WCAG AA for ink-on-paper and white-on-charcoal.

**Don’t:** Import MLX logos or product UI; don’t default to gradient text, glass stacks, or thick side-stripe accents; don’t spam uniform three-icon card grids.

---

**Implementation sync:** [dta-app/src/app/design-tokens.css](dta-app/src/app/design-tokens.css) and [dta-app/src/app/globals.css](dta-app/src/app/globals.css). Root markdown + CSS tokens win on drift.
