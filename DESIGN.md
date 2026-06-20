# Design System — Hoard

> Created by `/design-consultation`. Direction: **Molten Hoard**. Read this before any visual
> or UI decision. See [`docs/PRD.md`](docs/PRD.md) for product vision and the audience this serves.

## Product Context
- **What this is:** A fullscreen, offline-first mobile PWA that's a single player's utility belt
  at the tabletop (HP, coins, dice-next).
- **Who it's for:** Marcus, the mid-combat player (primary) reading state at arm's length in a
  dim room during a ~15-second turn; Priya, the rules-light newcomer (secondary).
- **Space/industry:** D&D 5e tabletop play (5e-first; domain kept generalizable).
- **Project type:** Mobile-first, fullscreen, installable PWA.

## Design Mandate (the audience, as constraints)
Every choice is measured against the table, not a Figma frame:
- **Dark-first.** Used in dim rooms. A "light mode" is the edge case, not the default.
- **Glanceable at arm's length.** Color + fill must read before digits do.
- **One-handed & eyes-elsewhere.** Big thumb-reach targets; tactile (haptic/sound) feedback so
  the app talks back without being looked at.
- **Fast under social pressure.** Core actions in two interactions, no OS keyboard.
- **Feels like a premium game object.** It competes with physical dice and minis.

## Aesthetic Direction
- **Direction:** Molten Hoard — a dragon's treasure rendered in light.
- **Decoration level:** intentional (subtle ember grain, gold rim-light on the orb; never on
  turn-critical numerals).
- **Mood:** warm, rich, luminous. Gold and gems glowing out of volcanic black. You glance and
  feel *I own something valuable*, then read your HP in the same beat.
- **Material thesis:** one material (molten gold + gemstone) carried through color, type, motion.

## Typography
Both families are self-hostable as `woff2` (required for the offline PWA, see issue #45). Subset to
Latin; preload the display weight used on first paint.
- **Display/Hero:** **Fraunces** — high-contrast serif with warmth and a little fantasy gravitas.
  Character name, headers, big moments ("You are bloodied").
- **Body / UI / Labels:** **DM Sans** — clean, legible, humanist-geometric.
- **Numerals / Data:** **DM Sans** with `font-variant-numeric: tabular-nums lining-nums` — HP,
  coin counts, anything that updates in place must not reflow or shimmer.
- **Mono accent (optional):** **JetBrains Mono** — dice expressions / technical readouts only.
- **Loading:** self-host woff2 (do **not** depend on a network font — see PRD §5.4 / #45).
- **Scale (rem, 16px base):** 0.69 / 0.81 / 0.94 (body) / 1.13 / 1.5 / 2.0 / 3.0 / 3.75 (hero HP).
  The HP numeral inside the orb is the largest type in the app, on purpose.

## Color
Dark-first. Hex values are the source of truth; mirror them as CSS custom properties.
- **Approach:** restrained — gold is the single lead accent; gems are reserved for semantic state.
- **Backgrounds:** volcanic black `#0B0A08`; raised `#100E0A`.
- **Surfaces:** `#16130D`; surface-2 `#1F1A11`.
- **Hairline / borders:** `#2A2418`.
- **Text:** warm ivory `#F4ECDD`; muted `#9A8F7A`.
- **Primary accent (gold):** `#E8B45A` (soft `#C9974A`) — identity, primary actions, the hoard.
- **Semantic:** heal emerald `#4FB477`, damage ruby `#D8453B`, temp/ward sapphire `#5B8FD9`,
  warning = gold `#E8B45A`, info = sapphire `#5B8FD9`.
- **HP tiers (orb fill):** healthy emerald → bloodied gold → critical ruby, blended gradually
  (not snapped — see closed issue #20).
- **"Candlelit" variant:** a slightly warmer/brighter dark (`bg #120F0A`, `gold #F0BE66`) for very
  dark rooms. Still dark. **Light mode** is explicitly out of the primary path.
- **Contrast:** body/critical text must stay legible on volcanic black; watch small gold-on-black
  (use ivory for small text, reserve gold for accents/large numerals). Ties to the dim
  character-name contrast item (#44).

## Signature treatment — Brushed gold (sensor-driven shimmer)
**Non-negotiable for this direction:** gold must read as **brushed metal**, never a flat fill.
Brushed metal is *defined* by how it throws light from different angles, so we simulate real
metal by driving the highlight with the **device orientation sensor** — tilt the phone and the
gold shimmers like a real coin catching candlelight. This is what makes "Molten Hoard" feel like
treasure instead of a yellow rectangle.

- **Reference (the bar to hit):** premium **foil / holographic trading cards** (Pokémon, MTG
  foils). Tilt the card, the sheen sweeps across it. We want that *exact* tilt-to-shimmer
  behaviour on Hoard's gold — a tactile "this is a collectible object" feel, not a flat UI color.
- **Material:** anisotropic gold — fine directional micro-streaks (a repeating low-contrast linear
  gradient) plus a brighter **specular highlight band** (the "foil sweep") running across the
  surface; a restrained warm chroma shift along the band sells the foil look without going rainbow.
- **Sensor link:** the highlight band's position/angle tracks device tilt via
  `DeviceOrientationEvent` (reuse the existing gyro infra in `src/ui/liquid/useGyro.ts`). Tilt =
  the band sweeps = shimmer. The orb's molten gold, primary (gold) buttons, the gold coin row, and
  large gold numerals all share one tilt source so they shimmer coherently.
- **Performance:** drive only `background-position`/gradient angle (GPU-cheap); throttle sensor to
  ~30–60fps; never reflow. Must hold 60fps on a mid-range phone.
- **Graceful degradation (required):**
  - No sensor / desktop / permission denied → a **static brushed-gold gradient** (still
    anisotropic, still looks like metal), with an optional slow time-based shimmer.
  - **iOS:** `DeviceOrientationEvent.requestPermission()` needs a user gesture (Safari 13+); hook
    into the same permission moment the liquid orb already uses. No permission → static fallback.
  - `prefers-reduced-motion` → disable the moving shimmer; keep the static brushed gradient.
- **Restraint:** shimmer lives on gold *material* surfaces only. Never on turn-critical numerals to
  the point of hurting legibility, and never on body text.

## Spacing
- **Base unit:** 4px.
- **Density:** comfortable, biased to large tap targets over information density.
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64).
- **Tap targets:** primary controls ≥ 64px; never below ~44px (keypad keys, coin steppers).

## Layout
- **Approach:** poster-first for the HP screen (orb + numeral as the hero), grid-disciplined for
  secondary surfaces (coins, keypad console).
- **Frame:** fullscreen portrait, safe-area-inset aware, one-screen budget (no bottom clipping —
  enforced by the e2e layout guard, #32).
- **Composition:** orb centered as the focal point; thumb controls anchored low; character name above.
- **Max content width:** phone-width; gracefully center on larger screens.
- **Border radius:** sm 8px · md 14px · lg 22px · full 9999px (orb and thumb buttons are full).

## Motion
- **Approach:** intentional and *weighty* — this is the tactile half of "feels like a game object."
- **Signature:** liquid slosh on HP change (mass, not bounce); coin clink on spend/distill; a
  heavier cue when crossing a tier or hitting 0.
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`.
- **Duration:** micro 50–100ms · short 150–250ms · medium 250–400ms · long 400–700ms.
- **Accessibility:** honor `prefers-reduced-motion` (drop slosh/choreography, keep instant state).

## Anti-slop guardrails
No purple/violet gradients, no 3-column icon grids, no centered-everything, no uniform bubbly
radius on everything, no gradient-button-as-default, no generic SaaS hero. Gold is earned, not sprayed.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-19 | Initial design system: **Molten Hoard** | `/design-consultation`. Audience confirmed dark/glanceable/tactile/fast; user chose a fresh direction over extending the shipped "Liquid Obsidian" look. Gold-on-warm-black owns the product's name and the premium-game-object feel while staying glanceable in dim rooms. |
| 2026-06-19 | Body/numeral font = **DM Sans** (not Geist) | DM Sans is freely available and self-hostable as woff2, satisfying the offline-PWA font requirement (#45) with the same clean feel. |
| 2026-06-19 | Gold = **sensor-driven brushed/foil shimmer**, not flat | Per user: gold only "works" if it reads as brushed metal that shimmers like a foil/holo trading card when the phone tilts. Drive the specular sweep from the device-orientation sensor (reuse `useGyro`), with a static brushed-gradient fallback when no sensor / reduced-motion. |
