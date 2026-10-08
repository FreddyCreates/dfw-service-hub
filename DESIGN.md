# Design Brief

## Direction

Workshop — a DFW service marketplace with the feel of a curated local-services magazine: utilitarian function, editorial confidence.

## Tone

Refined-utilitarian with editorial warmth — deep ink-blue authority on warm cream surfaces, burnt-amber accents for action and craft, never corporate-blue SaaS.

## Differentiation

Editorial serif (Fraunces) headlines on a working marketplace — feels like a trusted local business directory, not a generic job board.

## Color Palette

| Token      | OKLCH (light)      | OKLCH (dark)       | Role                          |
| ---------- | ------------------ | ------------------ | ----------------------------- |
| background | 0.97 0.012 75      | 0.15 0.018 250     | warm cream / deep ink night   |
| foreground | 0.18 0.02 250      | 0.93 0.01 75       | ink text / warm paper         |
| card       | 0.99 0.006 75      | 0.19 0.02 250      | elevated surface              |
| primary    | 0.42 0.16 250      | 0.7 0.14 55        | ink-blue / amber (dark)       |
| accent     | 0.66 0.14 55       | 0.62 0.12 250      | burnt amber / ink-blue (dark) |
| muted      | 0.93 0.015 75      | 0.24 0.022 250     | quiet section fill             |
| success    | 0.55 0.15 150      | 0.65 0.16 150      | booking completed / verified   |
| warning    | 0.72 0.15 75       | 0.72 0.15 75       | pending state                  |
| destructive| 0.5 0.2 25         | 0.55 0.2 25        | cancel / reject / remove       |

## Typography

- Display: Fraunces — hero headlines, section titles, provider names (editorial serif)
- Body: General Sans — UI labels, paragraphs, buttons, forms
- Mono: JetBrains Mono — booking IDs, status codes, admin metadata
- Scale: hero `text-5xl md:text-7xl font-display font-bold tracking-tight`, h2 `text-3xl md:text-5xl font-display font-bold tracking-tight`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Layered surfaces via alternating backgrounds; cards lift with warm-tinted ink shadows (sm→2xl), never neon glow. Header and footer get distinct surface treatment from content.

## Structural Zones

| Zone    | Background         | Border           | Notes                                          |
| ------- | ------------------ | ---------------- | ---------------------------------------------- |
| Header  | `bg-card`          | `border-b`       | sticky, elevated above content                 |
| Content | `bg-background`    | —                | alternate `bg-muted/30` every other section     |
| Cards   | `bg-card`          | `border`         | `shadow-sm` default, `shadow-md` on hover       |
| Sidebar | `bg-sidebar`       | `border-r`       | provider/admin portals                          |
| Footer  | `bg-muted/40`      | `border-t`       | quiet, informational                           |

## Spacing & Rhythm

Section gaps `py-16 md:py-24`; card padding `p-6`; tight `gap-2` for status badges, generous `gap-8` for portal grids; micro-spacing `space-y-1` for form field stacks.

## Component Patterns

- Buttons: ink-blue primary (filled), amber accent (secondary action), outline for tertiary; `rounded-md`, `transition-smooth` hover lift
- Cards: `rounded-lg`, `bg-card`, `border`, `shadow-sm` → `shadow-md` on hover
- Badges: `rounded-full`, status-tinted (success/warning/destructive) with `font-mono` for booking codes
- Star ratings: amber `text-accent` filled stars on `text-muted-foreground` empty

## Motion

- Entrance: fade-up 0.4s `cubic-bezier(0.4,0,0.2,1)` staggered on card grids
- Hover: card `shadow-md` lift + `-translate-y-0.5`, 0.2s
- Decorative: subtle gradient orb behind hero, no bouncy animations

## Constraints

- No on-platform payment UI — payments handled off-platform
- No recurring availability templates or blackout-date UI
- No provider analytics dashboard with revenue trends
- Light mode primary (customer-facing); dark mode for provider/admin portals
- Max 3 fonts, 5 core colors, one dominant interaction pattern

## Signature Detail

Fraunces serif headlines paired with JetBrains Mono booking codes — the magazine-meets-logistics voice that signals "trusted local craft" across DFW.
