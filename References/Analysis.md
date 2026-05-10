# design.md

# OMLX-Inspired Design System

> Reverse-engineered design language inspired by oMLX.ai
> Theme: Minimal Cinematic AI Infrastructure

---

# Table of Contents

1. Core Philosophy
2. Brand Personality
3. Color Palette
4. Typography
5. Layout System
6. Surface Design
7. Buttons
8. Motion System
9. Animation Patterns
10. Shadows & Lighting
11. Border Language
12. Background Design
13. Tailwind Translation
14. Interaction Design
15. UI Principles
16. Ideal Use Cases
17. AI Prompt Keywords
18. Full CSS Variables
19. Summary

---

# 1. Core Philosophy

The interface communicates:

* precision
* performance
* premium engineering
* computational power
* trust
* restraint

The aesthetic avoids:

* loud gradients
* playful SaaS visuals
* clutter
* excessive color
* exaggerated glassmorphism

Instead, it emphasizes:

* monochrome contrast
* subtle atmospheric motion
* editorial typography
* soft emissive lighting
* cinematic spacing
* GPU-inspired visuals

---

# 2. Brand Personality

## Keywords

* Cinematic
* Industrial
* Minimal
* Technical
* Premium
* Intelligent
* Confident
* Dense
* Precise
* Futuristic

## Comparable Products

* Apple Developer
* Linear.app
* Vercel AI
* Anthropic
* Arc Browser
* GPU rendering demos

---

# 3. Color Palette

## Core Colors

```css
:root {
  --bg-primary: #050505;
  --bg-secondary: #0B0B0C;

  --surface: #111214;
  --surface-elevated: #17181B;

  --text-primary: #F5F5F7;
  --text-secondary: rgba(255,255,255,0.72);
  --text-muted: rgba(255,255,255,0.45);

  --border: rgba(255,255,255,0.08);

  --accent-blue: #6EA8FF;
  --accent-cyan: #72D6FF;
  --accent-purple: #8B7DFF;
}
```

---

## Gradient Language

### Surface Gradient

```css
background:
linear-gradient(
  180deg,
  rgba(255,255,255,0.02),
  rgba(255,255,255,0)
);
```

### Glow Gradient

```css
background:
radial-gradient(
  circle,
  rgba(114,214,255,0.15),
  transparent 70%
);
```

## Gradient Philosophy

Gradients should:

* remain subtle
* support atmosphere
* simulate emissive light
* never overpower typography

---

# 4. Typography

## Font Stack

```css
font-family:
Inter,
SF Pro Display,
system-ui,
sans-serif;
```

---

## Hero Heading

```css
font-size: clamp(56px, 8vw, 110px);
font-weight: 700;
letter-spacing: -0.05em;
line-height: 0.92;
```

---

## Section Heading

```css
font-size: 32px;
font-weight: 600;
letter-spacing: -0.03em;
```

---

## Body Text

```css
font-size: 16px;
line-height: 1.65;
font-weight: 400;
```

---

## Labels / Metadata

```css
font-size: 11px;
letter-spacing: 0.18em;
text-transform: uppercase;
```

---

## Typography Philosophy

Typography should feel:

* editorial
* cinematic
* expensive
* precise
* dense

Avoid:

* playful fonts
* overly rounded fonts
* excessive hierarchy complexity

---

# 5. Layout System

## Container

```css
max-width: 1280px;
padding-inline: 32px;
margin-inline: auto;
```

---

## Section Spacing

```css
section {
  padding-block: 120px;
}
```

---

## Spacing Scale

```txt
4
8
12
16
24
32
48
72
96
144
```

---

## Layout Characteristics

* oversized hero regions
* asymmetrical whitespace
* strong vertical rhythm
* centered content containers
* minimal distractions

---

# 6. Surface Design

## Card Style

```css
background: rgba(255,255,255,0.03);

border:
1px solid rgba(255,255,255,0.08);

border-radius: 24px;

backdrop-filter: blur(12px);
```

---

## Surface Philosophy

Cards should feel:

* softly elevated
* atmospheric
* integrated into the background
* lightweight

Avoid:

* strong shadows
* colorful surfaces
* thick borders

---

# 7. Buttons

## Primary Button

```css
background: white;
color: black;

padding: 14px 22px;

border-radius: 999px;

font-weight: 600;
letter-spacing: -0.01em;
```

### Hover

```css
transform: translateY(-1px);
opacity: 0.92;
```

---

## Secondary Button

```css
background: rgba(255,255,255,0.04);

border:
1px solid rgba(255,255,255,0.08);

backdrop-filter: blur(12px);
```

---

# 8. Motion System

## Motion Philosophy

Animations should feel:

* frictionless
* inertial
* floating
* computational
* precise

Avoid:

* exaggerated bouncing
* playful motion
* distracting transitions

---

## Timing

| Animation        | Duration  |
| ---------------- | --------- |
| Hover            | 150ms     |
| Card transitions | 220ms     |
| Section reveals  | 500–700ms |
| Hero loops       | 6–20s     |

---

## Easing

```css
transition-timing-function:
cubic-bezier(0.22, 1, 0.36, 1);
```

---

# 9. Animation Patterns

## Floating Motion

```css
transform:
translateY(sin(time) * 8px);
```

---

## Fade-Up Reveal

### Initial

```css
opacity: 0;
transform: translateY(24px);
```

### Revealed

```css
opacity: 1;
transform: translateY(0);
```

---

## Glow Pulse

```css
opacity:
0.6 → 1 → 0.6;
```

---

## Gradient Drift

Large radial gradients slowly shift position.

Purpose:

* atmospheric depth
* computational energy
* subtle visual motion

---

# 10. Shadows & Lighting

## Preferred Glow

```css
box-shadow:
0 0 40px rgba(110,168,255,0.08);
```

---

## Lighting Philosophy

Use:

* emissive glows
* soft highlights
* subtle lighting

Avoid:

* harsh shadows
* heavy depth
* material-heavy realism

---

# 11. Border Language

## Standard Border

```css
border:
1px solid rgba(255,255,255,0.08);
```

---

## Hover Border

```css
border-color:
rgba(255,255,255,0.16);
```

---

# 12. Background Design

## Composition

Backgrounds are composed of:

* layered gradients
* radial glows
* subtle grain
* monochrome depth
* faint atmospheric movement

---

## Intended Feeling

Backgrounds should resemble:

* GPU rendering
* AI infrastructure
* futuristic hardware
* cinematic computation

---

# 13. Tailwind Translation

## Core Utilities

```txt
bg-black
text-white
border-white/10
rounded-3xl
backdrop-blur-xl
tracking-tight
font-semibold
max-w-7xl
```

---

## Surface Utilities

```txt
bg-white/[0.03]
border-white/[0.08]
text-white/70
```

---

# 14. Interaction Design

Interactions should:

* feel immediate
* reduce friction
* maintain calmness
* reinforce premium quality

Hover states should remain subtle.

Microinteractions should imply:

* responsiveness
* technical precision
* computational smoothness

---

# 15. UI Principles

## 1. Typography First

Typography drives hierarchy and emotional tone.

---

## 2. Motion Supports Meaning

Motion should enhance atmosphere rather than distract.

---

## 3. Minimal Color Usage

Most UI remains monochrome.

Accent colors are used sparingly.

---

## 4. Soft Contrast

Avoid hard edges and aggressive separation.

---

## 5. Precision Over Personality

The UI should feel engineered rather than playful.

---

# 16. Ideal Use Cases

This design system works well for:

* AI infrastructure
* developer tools
* robotics
* cloud systems
* engineering startups
* operating systems
* futuristic interfaces
* GPU platforms
* premium SaaS

---

# 17. AI Prompt Keywords

Use these for AI UI generation tools:

```txt
minimal cinematic AI infrastructure UI,
premium dark mode,
editorial typography,
Linear.app aesthetic,
Apple developer design,
soft emissive lighting,
GPU render interface,
monochrome luxury tech,
precision engineering UI,
subtle blue glow,
frosted dark surfaces,
high-end motion design
```

---

# 18. Full CSS Variables

```css
:root {

  /* Backgrounds */
  --bg-primary: #050505;
  --bg-secondary: #0B0B0C;

  /* Surfaces */
  --surface: #111214;
  --surface-elevated: #17181B;

  /* Text */
  --text-primary: #F5F5F7;
  --text-secondary: rgba(255,255,255,0.72);
  --text-muted: rgba(255,255,255,0.45);

  /* Borders */
  --border: rgba(255,255,255,0.08);

  /* Accent Colors */
  --accent-blue: #6EA8FF;
  --accent-cyan: #72D6FF;
  --accent-purple: #8B7DFF;

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-xl: 32px;

  /* Motion */
  --ease-premium:
    cubic-bezier(0.22, 1, 0.36, 1);

  /* Lighting */
  --glow-blue:
    0 0 40px rgba(110,168,255,0.08);

}
```

---

# 19. Summary

The design language can be summarized as:

> “Minimal cinematic infrastructure for serious AI engineering.”

The system combines:

* editorial typography
* restrained motion
* monochrome interfaces
* atmospheric lighting
* precision interactions
* premium spacing

to create a UI that feels:

* intelligent
* inevitable
* expensive
* trustworthy
* computational
