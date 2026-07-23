# Design Brief

## Direction

Workshop V3 — DFW Service Hub polished into a curated local-services marketplace with embedded trust protocols, rewards, and an AI-first surface.

## Tone

Refined-utilitarian with editorial warmth — deep ink-blue authority on warm cream, burnt-amber action accents, never corporate SaaS. Matured for premium feel and embedded accountability.

## Differentiation

Editorial Fraunces serif headlines meet a working trust-and-rewards system — magazine-meets-logistics voice signaling "trusted local craft" across DFW, now with verification ladders and an AI co-pilot.

## Color Palette

| Token      | OKLCH (light)      | OKLCH (dark)       | Role                          |
| ---------- | ------------------ | ------------------ | ----------------------------- |
| background | 0.97 0.012 75      | 0.15 0.018 250     | warm cream / deep ink night   |
| foreground | 0.18 0.02 250      | 0.93 0.01 75       | ink text / warm paper         |
| card       | 0.99 0.006 75      | 0.19 0.02 250      | elevated surface              |
| primary    | 0.42 0.16 250      | 0.7 0.14 55        | ink-blue / amber (dark)       |
| accent     | 0.66 0.14 55       | 0.62 0.12 250      | burnt amber / ink-blue (dark) |
| muted      | 0.93 0.015 75      | 0.24 0.022 250     | quiet section fill             |
| success    | 0.55 0.15 150      | 0.65 0.16 150      | completed / verified          |
| warning    | 0.72 0.15 75       | 0.72 0.15 75       | pending state                  |
| destructive| 0.5 0.2 25         | 0.55 0.2 25        | cancel / reject / remove       |

### Trust-badge tokens (embedded protocols)

| Token            | Light              | Role                                    |
| ---------------- | ------------------ | --------------------------------------- |
| trust-verified   | 0.55 0.15 150      | ID verified (green)                     |
| trust-checked    | 0.42 0.16 250      | background checked (ink-blue)           |
| trust-bound      | 0.66 0.14 55       | SLA-bound (amber)                       |
| trust-pending    | 0.72 0.15 75       | pending verification (warm)             |

### Verification-tier tokens (provider credibility ladder)

| Token              | Light              | Role                          |
| ------------------ | ------------------ | ----------------------------- |
| verify-basic       | 0.62 0.02 75       | basic profile                 |
| verify-confirmed   | 0.42 0.16 250      | confirmed identity            |
| verify-guaranteed  | 0.55 0.15 150      | guaranteed / SLA-backed       |

### Rewards-tier tokens (loyalty/gamification ladder)

| Token          | Light              | Role                          |
| -------------- | ------------------ | ----------------------------- |
| tier-bronze    | 0.55 0.08 55       | Bronze — entry tier           |
| tier-silver    | 0.62 0.02 250      | Silver — repeat customer       |
| tier-gold      | 0.74 0.13 80       | Gold — loyal patron            |
| tier-platinum  | 0.5 0.12 280       | Platinum — top-tier advocate  |

## Typography

- Display: Fraunces — hero headlines, section titles, provider names (editorial serif)
- Body: General Sans — UI labels, paragraphs, buttons, forms
- Mono: JetBrains Mono — booking IDs, status codes, trust scores, points balances
- Scale: hero `text-5xl md:text-7xl font-display font-bold tracking-tight`, h2 `text-3xl md:text-5xl font-display font-bold tracking-tight`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base`
- Rhythm tokens: `--text-xs`→`--text-7xl`, `--leading-tight`→`--leading-relaxed`, `--tracking-tight`→`--tracking-widest`

## Elevation & Depth

Layered surfaces via alternating backgrounds; cards lift with warm-tinted ink shadows (sm→2xl), plus `shadow-subtle`, `shadow-elevated`, `shadow-trust`, `shadow-tier` for protocol surfaces. Never neon glow.

## Structural Zones

| Zone    | Background         | Border           | Notes                                          |
| ------- | ------------------ | ---------------- | ---------------------------------------------- |
| Header  | `bg-card`          | `border-b`       | sticky, elevated above content                 |
| Content | `bg-background`    | —                | alternate `bg-muted/30` every other section     |
| Cards   | `bg-card`          | `border`         | `shadow-sm` default, `shadow-md` on hover       |
| Sidebar | `bg-sidebar`       | `border-r`       | provider/admin portals                          |
| Footer  | `bg-muted/40`      | `border-t`       | quiet, informational                           |
| Trust   | `*-bg` tinted      | `border`         | trust-badge & verification-tier pills           |
| Rewards | `tier-*-bg` tinted | `border`         | rewards wallet, tier badges, loyalty chips      |
| AI panel| `bg-card`          | `border-l`       | assistant drawer, elevated `shadow-elevated`    |
| Dispute | `bg-card`          | `border`         | flow steps, status-coded badges                 |
| Docs    | `bg-background`    | `border`         | hub cards, prose typography                     |

## Spacing & Rhythm

Section gaps `py-16 md:py-24` (`--section-gap` 6rem); card padding `p-6` (`--card-pad` 1.5rem); grid gap `--grid-gap` 2rem; tight `gap-2` for status badges, generous `gap-8` for portal grids; micro `--stack-tight` 0.25rem for form field stacks. 4px base scale (`--space-1`→`--space-16`).

## Component Patterns

- Buttons: ink-blue primary (filled), amber accent (secondary), outline tertiary; `rounded-md`, `transition-smooth` hover lift, `focus-ring` on focus-visible
- Cards: `rounded-lg`, `bg-card`, `border`, `shadow-sm` → `shadow-md` on hover via `animate-card-hover-lift`
- Badges: `rounded-full`, status-tinted (success/warning/destructive) with `font-mono` for booking codes; trust badges use `*-bg` tints + checkmark glyph; tier badges use `tier-*` tints
- Trust gauge: circular score 0–100 in `font-mono`, gradient-trust stroke
- Rewards wallet: compact card, tier badge + points balance + progress bar to next tier + earned loyalty chips
- Skeletons: `.skeleton` + `.animate-shimmer` for loading states; empty states with illustrations
- AI assistant: dockable panel `border-l` + `shadow-elevated`, proactive suggestions surfaced inline

## Motion

- Entrance: `animate-fade-in-up` 0.5s `cubic-bezier(0.4,0,0.2,1)` staggered via `.stagger-1`–`.stagger-6`
- Page transition: `animate-page-transition` 0.4s on route change
- Hover: `animate-card-hover-lift` translateY(-2px) + `shadow-md`, 0.3s
- Badge: `animate-badge-pop` 0.4s spring on tier/trust badge award
- Loading: `animate-shimmer` 1.6s infinite on skeletons
- Reduced-motion: all motion collapses to 0.01ms via `prefers-reduced-motion` guard; hover lifts and shimmer disabled

## Constraints

- No on-platform payment UI — payments handled off-platform
- No recurring availability templates or blackout-date UI
- No provider analytics dashboard with revenue trends
- No points redemption for booking discounts or gift cards
- No provider team accounts with multiple staff logins
- Light mode primary (customer-facing); dark mode for provider/admin portals
- Max 3 fonts, 5 core colors + protocol/tier accent families, one dominant interaction pattern

## Signature Detail

Fraunces serif headlines paired with JetBrains Mono trust scores and tier badges — the magazine-meets-logistics voice that signals "trusted local craft" across DFW, now layered with embedded trust protocols and a rewards ladder.
