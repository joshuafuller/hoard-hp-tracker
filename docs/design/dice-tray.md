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

## Controls — dice-pool builder (zero-typing core)
The chip bar is a **pool builder**, not a single-select (revised 2026-06-20 per user):
- **Die chips** d4–d100: **tap to add one** die of that size (a badge shows the count); five taps of
  d20 = `5d20`, mix freely (`2d6 + 1d4`). Chips are **flexible pills** so all seven always fit the row
  (no horizontal clipping at any phone width — guarded by e2e).
- **Removable tags + live expression**: the built pool shows as removable tags and a live notation
  string that is **the same roll the notation field edits** — buttons and typed notation are two views
  of one roll, so **every permutation is reachable both ways**. **Clear** resets the pool.
- **Modifier** stepper; **remembered** between throws.
- **Adv/Dis = one symmetric segment** *Disadvantage · Normal · Advantage* — **co-equal**, but enabled
  **only for a lone d20** (the 5e keep-high/low rule; "advantage on 3d6" is meaningless, so it dims).
- **Notation is the same field** — the live expression line is itself editable: tap it and type full
  Roll20 grammar (`4d6kh3!`) right where the dice are built. No separate panel; chips write into it,
  hand-editing hides the stale tags. Never required for the chip/advantage core path.
- Interaction budget: a plain d20 is ≤ 3 interactions; advantage / a modifier add at most one tap each.

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
