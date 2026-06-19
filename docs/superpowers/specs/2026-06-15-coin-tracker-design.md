# Coin / Currency Tracker — Design

**Date:** 2026-06-15
**Issue:** #23
**Branch:** `feat/coin-tracker` → PR into `beta`

## Problem

Players track coin during the session on a separate sheet. Fold it into the app
(which they already use for HP at the table) without cluttering the main HP page.

## Decisions (from brainstorming)

1. **Three denominations:** Gold (gp), Silver (sp), Copper (cp). No platinum/electrum.
2. **Input reuses the keypad:** tapping a coin row opens the number-first keypad
   with **Add** (+, green), **Spend** (−, red, clamps at 0), **Set**.
3. **Total-in-gold readout:** live `≈ N gp` = `gp + sp/10 + cp/100`. No conversion/exchange this round.
4. **Off the main page:** a coin button in the top chrome (next to the sound toggle)
   opens a bottom sheet (same modal pattern as the keypad).
5. **Persisted** in the existing Dexie record (new `gp/sp/cp` fields; no migration —
   absent fields read as 0).

## Architecture

Mirror the existing HP stack (pure domain → store hook → presentational UI), and
generalise the keypad so HP and coins share one component.

### Domain — `src/domain/coins.ts` (new, pure)
- `type CoinKind = "gp" | "sp" | "cp"`.
- `type Coins = { gp: number; sp: number; cp: number }`.
- `addCoin(c, kind, n)`, `spendCoin(c, kind, n)` (result clamps at 0; never negative),
  `setCoin(c, kind, n)` (clamp ≥ 0, integer).
- `totalGp(c): number` = `gp + sp / 10 + cp / 100`.
- Pure, integer-only, no I/O. Unit-tested for clamping, conservation, total.

### Store — `src/store/useCoins.ts` (new hook)
- Reads the three coin fields off the same single record (`useLiveQuery`), defaulting
  each to 0. Reuses the same resilient `write()` transaction pattern as `useHp`
  (read-fresh-inside-txn, reopen-and-retry). (Extract the shared write helper if it's
  clean to do so; otherwise mirror it — do not entangle coins into `useHp`.)
- Exposes `{ gp, sp, cp, total, add(kind,n), spend(kind,n), set(kind,n) }`.
- `db.ts`: add `gp/sp/cp` to `HpRecord` (optional) and the `SEED` (0/0/0).

### UI
- **`AmountKeypad`** (new, generalised from `HpKeypad`): the digit pad + amount
  display + a configurable list of action buttons `{ label, tone: "add"|"spend"|"set"|"damage"|"heal"|"temp", onCommit(n) }`. Keeps the focus-trap, hardware-key
  entry, 4-digit cap, and the typed-0 rules. **`HpKeypad` is refactored to render
  `AmountKeypad`** with its Damage/Heal/Set/Temp actions — its 17 tests stay green.
- **`CoinButton`** (new): the `¢` button in `.hp-tracker__chrome` (next to `SoundToggle`),
  opens the sheet.
- **`CoinSheet`** (new): bottom-sheet modal (reuses `.hp-editor` backdrop/sheet):
  a header with `COINS` + live `≈ N gp`, three rows (Gold/Silver/Copper with a coin-color
  dot + count), each tappable. Tapping a row opens `AmountKeypad` (Add/Spend/Set) for
  that denomination; on commit it calls the store and returns to the rows (sheet stays open).
- **`App`**: render `CoinButton` in the chrome and `CoinSheet` when open. The HP keypad
  and coin sheet are mutually exclusive with the other modals.

## Data flow

```
tap ¢  → open CoinSheet
  tap a coin row → AmountKeypad(add/spend/set) for that kind
    type → Add/Spend/Set → useCoins.<action>(kind, n) → record persists → row + total update
  backdrop/Escape → close
```

## Testing (TDD, vitest)
- `coins.ts`: add/spend/set clamp at 0, integer, totalGp math (10sp=1gp, 100cp=1gp), purity.
- `useCoins`: actions persist and read back; spend clamps at 0; defaults to 0 when fields absent.
- `AmountKeypad`: existing HpKeypad behaviours via the generalised component; an action list
  renders the right buttons and commits the typed amount.
- `CoinSheet`: renders three rows + total; tapping a row opens the keypad; Add/Spend/Set
  call the store with the right kind+amount; total updates.
- `App` integration: ¢ opens the sheet; add gp → count + total update; sheet is off the HP page.

## Non-goals (this PR)
- Electrum; configurable denominations.
- Coin history / undo (HP undo is separate; coins are low-stakes).

## Follow-up (2026-06-19): platinum + auto-conversion
The first cut tracked gp/sp/cp with no conversion — spending a denomination
just clamped that one count at 0, so "spend 1 sp" while holding only 1 gp did
nothing. Two changes landed since:
- **Platinum (pp)** added as a fourth denomination (1 pp = 10 gp). DB `version(5)`
  backfills existing records with `pp: 0`.
- **`spendCoin` now converts across denominations** ("break only when needed"):
  pay from the spent kind first, otherwise break the smallest sufficient higher
  coin (change returns as the spent kind — e.g. spend 1 sp from 1 gp ⇒ 9 sp), and
  failing that combine lower coins to cover the rest. Total wealth is conserved
  (computed in copper via `totalCp`); a spend the purse can't afford is a no-op
  rather than going negative. Existing coins are **not** auto-normalised
  (12 sp stays 12 sp, not 1 gp 2 sp). `addCoin`/`setCoin` are unchanged.

## Follow-up (2026-06-19): spend bug fix + auto-distill & sheet rethink

### `spendCoin` — break the smallest *sufficient* higher coin
The "smallest sufficient higher" step consumed insufficient higher coins
greedily before checking a larger one: spending 15 sp while holding 1 gp + 1 pp
broke the gp (100 cp < 150 cp owed) *and* the pp, leaving 0 gp + 95 sp. Now the
step first looks for the smallest single higher coin whose value covers what's
still owed and breaks just that one (→ 1 gp + 85 sp, gp preserved); only when no
single higher coin is enough does it chip from the largest available until the
remainder fits in one break. Wealth is still conserved; an unaffordable spend is
still a no-op.

### Auto-distill (`distill`)
New pure `distill(coins)`: collapse the purse into the fewest coins of the
highest denominations, conserving total wealth (greedy in copper, pp→cp). e.g.
123 cp ⇒ 1 gp 2 sp 3 cp; 2pp 41gp 12sp 30cp ⇒ 6pp 2gp 5sp 0cp. Idempotent, so
the sheet can detect an already-minimal purse (`coinsEqual`). Uses platinum (the
true minimal-coin form). `useCoins` gains `distill()` plus an **ephemeral undo**
(`lastDistill` snapshot + `undoDistill`/`dismissDistill`), mirroring the HP
hook's `lastChange`.

### Coin sheet rethink (UI/UX)
The passive list of counts becomes an actionable sheet:
- **Hero total** at the top (the gold-equivalent wealth, large).
- **`CoinRow`** per denomination with inline **−/+ steppers** (single-coin
  nudges; − disabled at 0) and a **tap-to-edit count** that opens the shared
  keypad for larger amounts.
- **Unified switchable keypad** (no per-row keypad): `AmountKeypad` gains an
  optional `header` slot; the coin keypad fills it with a **denomination
  switcher strip** (pp/gp/sp/cp tabs with live counts). One keypad serves all
  four coins — tap a tab to retarget Add/Spend/Set without closing, and the
  typed amount persists across switches (`closeOnCommit={false}`), so "type 10,
  add to gold, switch to silver, add 10" is one fluid gesture. This replaces the
  original denomination-first "open a keypad bound to one coin" flow.
- **Distill lives ON the console** (the keypad's footer slot), not on a separate
  sheet footer or a floating pill — "Distill to fewest coins", disabled and
  labelled "Already distilled" when the purse is minimal.
- **`DistillConfirm`** modal: a per-denomination **before→after diff** (changed
  rows highlighted, unchanged rows receded) and a **"total unchanged"** line
  proving wealth is conserved — so accepting is never a leap of faith. Escape /
  backdrop / Cancel dismiss; Distill commits.
- **Undo ON the console**: after distilling, the console's distill slot becomes
  "Distilled · ↶ Undo" for ~5s — integrated into the coin calculator itself, not
  a separate/floating element like the HP undo pill. (This supersedes the
  original "no coin undo" non-goal, scoped to the bulk distill action.)

## Rollout
Feature branch → PR into `beta` → verify on `/beta/` (and on a real phone) →
promote `beta` → `main`. TDD red→green; bot review findings handled in-thread.
