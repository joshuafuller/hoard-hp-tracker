# Dice tray — locked design (Variant B · Immersive dock)

**Status:** Approved 2026-06-20 · the build reference for #75 · **Live mockup:** [`dice-tray.html`](./dice-tray.html)
**Reads with:** [`../../DESIGN.md`](../../DESIGN.md) · spec #73 · [`../ux/dice-journeys.md`](../ux/dice-journeys.md) · [`../ux/dice-storyboard.md`](../ux/dice-storyboard.md)

Chosen from a 3-variant shotgun (A console sheet · **B immersive dock** · C deck card). B won because it
hits the DESIGN.md mandate hardest — *premium game object, competes with physical dice, glanceable at
arm's length, colour+fill before digits* — and it is the storyboard's hero beat: dice tumble, the giant
total reads across the table.

## The surface
- **Entry:** a 4th **gold d20 token** in the chrome (matches `CoinToken`/sound/concentration). Tap → tray.
- **Table throw:** dims the HP card; the whole screen becomes a transparent tray; dice tumble over the orb.
- **Dock:** a slim translucent dock anchored low (thumb-reach) holds the controls; dice + the giant
  **Fraunces total** own the centre. Tap-the-tray clears; ✕ / Escape closes; the tray is inert when closed.

## Controls (zero-typing core)
- **Die chips** d4–d100 (gold-medallion when active); **d20 pre-selected** on open.
- **Modifier** stepper; **last modifier remembered** between throws.
- **Adv/Dis = one symmetric segment** *Disadvantage · Normal · Advantage* — **co-equal** (Advantage lights
  gold, Disadvantage lights ruby). Never a lopsided advantage-only control.
- **Notation** escape hatch behind a ⌨ glyph (JetBrains Mono) — secondary, never required for the core path.
- Interaction budget: plain d20 ≤ 3 interactions; advantage / a modifier add at most one tap each.

## The five build states (see the mockup)
1. **Ready** — d20 pre-selected, "flick to throw".
2. **Result** — kept die glows, dropped die struck ruby, giant gold total, expression, manual **✚ Apply as heal**.
3. **Death save** (auto at 0 HP) — always 1d20, no chips/adv, app **marks the pip itself** (≥10 success), pip tracks shown.
4. **Hit Die → heal** (short rest) — context-aware: roll + CON **auto-offered** as healing; **emerald** total.
5. **History** — recent rolls newest-first (notation + per-die + total), session-persisted, clearable.

## Colour language (consistent with the app)
- **Gold** = informational / attack (read aloud) · **Emerald** = heals *you* · **Ruby** = dropped die / failure.

## Material & motion
- The gold dice + Throw button carry the **brushed-gold foil specular streak**; at runtime it sweeps with
  device tilt (reuse `src/ui/liquid/useGyro.ts`), static fallback on desktop / no-sensor (DESIGN.md §Signature).
- **`prefers-reduced-motion`:** dice **settle instantly** (no tumble) but still show total + per-die + struck result.
