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
- Platinum / electrum; configurable denominations.
- Conversion / exchange between denominations.
- Coin history / undo (HP undo is separate; coins are low-stakes).

## Rollout
Feature branch → PR into `beta` → verify on `/beta/` (and on a real phone) →
promote `beta` → `main`. TDD red→green; bot review findings handled in-thread.
