# Quick Damage / Heal Keypad — Design

**Date:** 2026-06-15
**Stories:** US-1 (Quick damage/heal entry · Must), US-2 (Undo last change · Must), US-5 (Temp HP via the keypad · Should)
**Source:** `docs/ux/single-character-hp-tracker.md` §4 — "Recommended first PR: US-1 + US-2 (+ US-5)"
**Branch:** `feat/quick-damage-heal-keypad` → PR into `beta`

## Problem

Applying an exact amount of damage or healing is tedious. To take 9 damage a
player taps `−5 −1 −1 −1 −1` — five taps for one number. The journey map flags
the friction cluster at *input* (damage, heal, temp). Players want to type the
exact number and apply it in one motion.

## Goal

A number-first quick-entry keypad that applies an arbitrary amount as **Damage**,
**Heal**, **Set**, or **Temp**, plus a single-level **Undo** of the last change.
Validated with real players: number-first was unanimously preferred.

## Decisions (from brainstorming)

1. **Number-first.** Type the amount, then the action button commits it. The
   action (Damage/Heal/Set/Temp) *is* the commit — no separate Apply step.
2. **Trigger.** Tapping the big current-HP number opens the keypad sheet.
   "Set exact value" for current HP becomes the keypad's **Set** action.
   Tapping `/max` still opens the existing set-max editor (unchanged).
3. **After apply.** The sheet closes so the player sees the orb react (the
   liquid slosh/fill). A transient **Undo** pill shows the last change.
4. **Steppers stay.** The footer ±1/±5 steppers are unchanged (quick nudges).
5. **No new game rules.** The keypad feeds amounts into the existing `useHp`
   actions; heal-caps-at-max, damage-drains-temp-first, and 0-HP→death-saves
   are all unchanged.

## Components

### `HpKeypad` (new) — `src/ui/HpKeypad.tsx`
A bottom-sheet modal. Presentational; all state in/out via props.

- **Props:** `current`, `max`, `temp`, `onDamage(n)`, `onHeal(n)`, `onSetCurrent(n)`,
  `onSetTemp(n)`, `onClose()`.
- **Local state:** the typed amount string (digits only).
- **Layout (top→bottom):** amount display (large, tabular-nums); a context line
  (`current 24 / 30 · +0 temp`); a 3×4 numeric pad (`1–9`, `0`, `⌫`, `C`);
  primary action row **Damage** (critical/red) | **Heal** (healthy/green);
  secondary row **Set to N** | **Temp = N**.
- **Behaviour:** digits append (capped at 4 chars / ≤ 9999); `⌫` removes last;
  `C` clears. With an empty/zero amount the action buttons are disabled (no-op).
  Tapping an action calls the matching callback with the parsed integer, then
  `onClose()`. Dismiss on backdrop tap / Escape / a close control.
- **A11y:** focus-trapped dialog (`role="dialog"`, labelled), keypad buttons are
  real `<button>`s, hardware keyboard digits/Enter/Backspace also work, the
  amount display is an `aria-live` readout. Matches the existing
  `HpValueEditor` modal conventions.

### `UndoPill` (new) — `src/ui/UndoPill.tsx`
A transient pill anchored above the footer.

- **Props:** `label` (e.g. `"Healed +9"`), `onUndo()`, `onDismiss()`.
- Appears after a mutating action, auto-dismisses after ~4s or when the next
  action happens; tapping **Undo** reverts and dismisses. `role="status"`.

### `useHp` (extend) — `src/store/useHp.ts`
- Add **`undo(): Promise<void>`** and a one-deep snapshot of the HP record taken
  *before* each mutating action (damage / heal / setCurrent / setTempValue).
  `undo()` restores that snapshot and clears it (single level; no redo).
- Add a small "last change" descriptor the UI can render in the pill
  (kind + delta, e.g. `{ kind: "heal", delta: 9 }`), derived from the snapshot
  vs. the new value, or returned by the action.
- Rests (short/long) are out of undo scope for this PR (see Non-goals).

### `App` (wire) — `src/App.tsx`
- Tapping the current-HP number opens `HpKeypad` instead of the current
  set-current editor. `/max` and the temp badge behaviour: `/max` keeps the
  set-max editor; the temp badge opens the keypad (so Temp is set there per US-5).
- Render `UndoPill` when `useHp` has an undoable last change.

## Data flow

```
tap HP number ─▶ open HpKeypad
  type digits ─▶ local amount
  tap Damage/Heal/Set/Temp ─▶ useHp.<action>(amount)
      └─ useHp snapshots prior record, applies via existing domain logic
  onClose() ─▶ sheet closes ─▶ orb re-renders (existing flash/slosh)
  UndoPill shows last change ─▶ tap Undo ─▶ useHp.undo() restores snapshot
```

## Testing (TDD, vitest)

- **`useHp.undo`:** after damage / heal / setCurrent / setTempValue, `undo()`
  restores the prior value; only the last action is undoable; undo after no
  action is a no-op; the last-change descriptor matches the applied delta.
- **`HpKeypad`:** digits build the amount; `⌫`/`C` edit/clear; empty amount
  disables actions; each action button calls the correct callback with the
  parsed integer and closes; hardware keyboard entry works; dialog is
  focus-trapped and labelled.
- **`UndoPill`:** renders the label, calls `onUndo`, auto-dismisses.
- **`App` integration:** tap current-HP number → keypad opens; type `9` + Heal →
  current rises by 9 (capped at max) and the orb readout updates; Undo pill
  appears and reverts; tapping `/max` still opens the set-max editor.

## Non-goals (this PR)

- Editing **Max HP** via the keypad — stays on the existing pill editor.
- Multi-level undo / redo history — single level only.
- Undo for short/long rests — only damage/heal/set/temp.
- US-3 (concentration CON-save prompt) and US-4 (character name) — later PRs.

## Rollout

Feature branch → PR into `beta` → verify on `/beta/` (and on a real phone,
since it's a touch interaction) → promote `beta` → `main`. TDD red→green
throughout; address bot review findings in-thread.
