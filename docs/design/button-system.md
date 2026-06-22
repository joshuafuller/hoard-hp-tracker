# Button System — spec (for review)

**Status:** Draft for approval · **Owner:** Joshua Fuller · **2026-06-20**
**Extends:** [`DESIGN.md`](../../DESIGN.md) (Molten Hoard tokens) · folded into the dice PR (#79)

> The app grew a **bespoke button per surface** (audit below) — many ways to do the same thing
> (3 close buttons, 2 steppers, several gold "action" treatments). This spec defines **one small set
> of button primitives** + shared tokens, and a **class-by-class migration map**, so every button is
> consistent and we rethink placement in the same pass. No code until this is approved.

---

## 1. The mix today (audit)

| Role | Bespoke classes in the codebase |
|---|---|
| Gold action | `dice-throw`, `rest-controls__btn`, `keypad__apply`, coin add/spend |
| Icon token (round gold) | `coin-token` / `coin-button`, `dice-token` |
| Icon close (round ghost) | `dice-tray__close`, `dice-history__close`, `coins__close` *(3 variants)* |
| Toggle | `sound-toggle`, `concentration-toggle` |
| Stepper (±) | `dice-mod__pm`, `coin-row__step` *(2 variants)* |
| Keypad keys | `keypad__key`, `keypad__minor`, `keypad__secondary`, `keypad__apply` |
| Selectable chip | `dice-chip`, `dice-pool__tag`, `dice-result__chip`, `coin-row__dot` |
| Segmented | `dice-controls__adv` |
| Text / ghost | `dice-history__clear`, `undo-pill__btn`, `coins__undo-btn`, rest Confirm/Cancel, `hp-editor__pill` |

---

## 2. The primitives (proposed)

Six primitives cover every case. All consume Molten Hoard tokens; all centre icons via SVG `Glyph`
(never text glyphs); all meet the tap-target minimum.

### `Button` — text actions
`<Button variant size>` — props: `variant`, `size`, `disabled`, `onClick`, optional leading `Glyph`.
- **`primary`** — brushed-gold pill (the one main action on a surface). Gold-body gradient + foil sweep,
  dark engraved text. *e.g.* Throw, keypad Apply, Long-Rest Confirm, coin Add/Spend.
- **`ghost`** — transparent, hairline border, ivory text. Secondary actions. *e.g.* Clear, Cancel, Undo, notation back.
- **`heal`** — emerald-accented variant of primary/ghost for "heals you" actions (Apply-as-heal). Matches the colour language (gold = info, emerald = heal, ruby = danger).
- **`danger`** *(only if needed)* — ruby-accented (e.g. a future destructive confirm).
- **sizes:** `lg` (≈56px, primary surface actions) · `md` (≈44px) · `sm` (≈34px, inline ghost/text).

### `IconButton` — icon-only, round
`<IconButton variant pressed? aria-label>` with a `Glyph`.
- **`token`** — gold medallion (chrome entry points: coins, dice). One chrome size (44px).
- **`ghost`** — subtle round, hairline border, ivory icon (close X, log). One size per context (≈36px).
- **`pressed` state** folds in **toggles** (sound, concentration) via `aria-pressed`.

### `Stepper` — round ± control
`<Stepper onDec onInc value? />` — two round `−`/`+` buttons flanking a tabular-nums readout. One style for the modifier stepper, coin steps, max-HP nudges.

### `Chip` — selectable / removable / readout pill
`<Chip selected? badge? removable? onClick>` — die chips, coin denominations, result dice, pool tags. States: default · **selected** (gold) · **badge** (count) · **removable** (× affordance).

### `Segment` — grouped segmented control
`<Segment options value onChange>` — co-equal segments, one active (advantage/normal/disadvantage; reusable for any 2–3-way choice). Honours the "co-equal, never lopsided" rule.

### Keypad keys
Keep the keypad's **grid layout** (it's a numeric pad, not a row of buttons), but restyle the keys from the shared **`Chip`/Button tokens** so they match — not a separate visual language.

---

## 3. Shared tokens (add to `:root` in styles.css; document in DESIGN.md)

```
--gold-body   : (promoted from dice.css — the canonical brushed-gold gradient)
--btn-h-lg: 56px;  --btn-h-md: 44px;  --btn-h-sm: 34px;   /* heights / min tap targets */
--icon-btn:   44px (token, chrome) ;  --icon-btn-sm: 36px (ghost/close)
--btn-radius: var(--radius-pill);     /* actions are pills; chips round/pill */
--ring-gold:  inset 0 0 0 1.5px rgba(255,244,206,.6);     /* shared gold bevel */
--hairline:   1px solid var(--obsidian-600);              /* ghost border */
```
Gold surfaces (`primary`, `token`, selected `Chip`) reuse the **foil sweep** treatment (DESIGN.md §Signature) from one tilt source, so all gold shimmers coherently.

---

## 4. Migration map (class → primitive)

| Current | → Primitive |
|---|---|
| `dice-throw`, `keypad__apply`, coin Add/Spend | `Button variant=primary size=lg` |
| `rest-controls__btn` (Short/Long Rest) | `Button primary` (see §5 placement) |
| `rest-controls__confirm-btn` (Confirm/Cancel), `dice-history__clear`, `coins__undo-btn`, `undo-pill__btn`, `dice-notation` back | `Button variant=ghost` |
| `dice-applyheal` | `Button variant=heal` |
| `coin-token`/`coin-button`, `dice-token` | `IconButton variant=token` |
| `dice-tray__close`, `dice-history__close`, `coins__close` | `IconButton variant=ghost` (Glyph close) |
| `sound-toggle`, `concentration-toggle` | `IconButton variant=ghost pressed` |
| `dice-mod__pm`, `coin-row__step` | `Stepper` |
| `dice-chip`, `dice-pool__tag`, `dice-result__chip`, `coin-row__dot` | `Chip` (selected/removable/readout) |
| `dice-controls__adv` | `Segment` |
| `keypad__key`/`minor`/`secondary` | keypad grid, keys styled from shared tokens |
| `hp-editor__pill` | `Button ghost` / `Stepper` as fits |

---

## 5. Placement rethink (same pass)

- **Chrome icon row (top-right):** one consistent icon size + gap for coins · dice · sound · concentration (today: 44px pill + 44px round + two toggles — unify to one `IconButton` shape/size).
- **One primary action per surface, anchored low** (thumb reach): Throw, keypad Apply, rest. Don't show two competing gold buttons in one view.
- **Close X always top-right** of any overlay/sheet (tray, log, coins), identical `IconButton ghost`.
- **Steppers** read `−  value  +` consistently everywhere.
- **Open question:** Short Rest + Long Rest are two gold buttons side-by-side — keep both gold, or make Long Rest `primary` and Short Rest `ghost` (since Long is the bigger commit)? Decide during the mock.

---

## 6. Plan (after approval)

1. Add tokens + promote `--gold-body` to styles.css; document the button system in DESIGN.md.
2. Build primitives in `src/ui/controls/` (`Button`, `IconButton`, `Stepper`, `Chip`, `Segment`) — each TDD'd (renders variant/state, fires onClick, accessible name, disabled).
3. Migrate surface-by-surface (dice → coins → keypad → rest → chrome), keeping every existing test green; update layout-guard/e2e as needed.
4. Delete the dead bespoke classes. Verify in-browser at phone + desktop.

**Non-goals:** changing what buttons *do*; the foil-shimmer runtime work (tracked separately, #51).
