# Spike report — exploding/reroll dice reconcile (#97)

**Question:** why does an exploding die show a different value in the record than the
physical die on the table, and what's the right fix?

**Method:** temporary instrumentation in `createDiceTray.roll` stashed the raw dice-box
`results` and the parser `parseFinalResults(...)` output on `window.__diceProbe`, then
captured real rolls in-browser (the instrumentation has been reverted — not committed).

## Findings

### 1. The physical results are correct and complete
A fresh-load `8d6!` that exploded:

```
physical results (9 rolls):  0:4  1:3  2:6  3:1  4:5  5:2  6:1  7:5   2.1:5
```

- 8 initial dice, `rollId` `0..7` (the `6` is `rollId 2`).
- the explosion is `rollId "2.1"` with value **5** — i.e. the die added for `rollId 2`'s
  explosion. **The value matches the physical die the user saw.**
- **`rollId` encodes the round**: integer ⇒ round 1; `"X.1"` ⇒ round 2; `"X.2"` ⇒ round 3
  (the parser's `incrementId`: `2` → `2.1` → `2.2`).
- Each roll has `{ rollId, sides, value }`. **No `explode` / `drop` / `valid` flags** —
  dice-box only reports physical faces.

### 2. `parseFinalResults` returns GARBAGE on explosions
For the same exploded roll:

```
parser final:  total = null,  rolls = null null null null null null null null
```

`parseFinalResults` (which re-rolls the notation through the parser's RNG, consuming the
physical values as floats) **breaks when extra dice are added** — it returns a null total
and null die values. When there is no explosion, physical == parser (values match), so the
bug is specific to added-dice cases (explode / reroll).

### 3. Why the user saw `+3` instead of the physical `5`
`toRollRecord(garbageFinal)` → null/empty → `isPlausibleRoll` is **false** → the engine
guard (#93) falls back to `rollHeadless(notation)`, which rolls an **independent** `8d6!`
and happened to explode into a `3`. So the displayed roll was a *different, unrelated* roll
from the dice on the table. The guard did its job (no crash), but masked the real result.

### 4. The parser `final` tree has no `rollId`
So we **cannot** join "physical values" to "parser structure (drop/explode/round)" by id.

## Recommendation — physics-authoritative record (`recordFromPhysical`)

Build the record from the **physical `results`** (what the user sees), not from
`parseFinalResults`:

- **values** ← physical `roll.value`
- **rounds** ← parsed from `roll.rollId` (integer ⇒ 1; `"X.n"` ⇒ `n+1`)
- **exploded flag** ← `value === sides` (for explode notations)
- **total** ← `sum(values) + modifier`, modifier read from the notation
- **dropped** ← only relevant to keep/drop notations (see edge cases)

This is a **pure function** `recordFromPhysical(results, notation): RollRecord` →
**unit-testable** with fixtures (capture the `8d6!` explosion above as a fixture), which
removes the "WebGL-only, untestable" problem for the correctness-critical part.

### Routing
- **explode / reroll / plain / +mod** (additive, no keep/drop/success): `recordFromPhysical`.
  Guarantees record == table.
- **keep/drop / success / fudge** (no added dice, so physics ⇄ parser stay in sync today):
  keep the existing `parseFinalResults` path — it is correct there.
- The existing `isPlausibleRoll` guard stays as the last-resort safety net.

### Edge cases / risks
- **keep/drop + explode together** (e.g. `4d6kh3!`) — rare-of-rare. `recordFromPhysical`
  doesn't know the keep/drop rule; `parseFinalResults` breaks on the explosion. Acceptable
  to leave imperfect initially; note it. A later pass could re-implement keep/drop over the
  physical dice.
- **reroll (`r`/`ro`)** replaces a die — confirm whether dice-box reuses the `rollId` or
  appends a new one; handle both (the value shown is the kept one).
- **rollId format** — verified `"X.1"`, `"X.2"` for chains; parse defensively (split on `.`).
- **reduced-motion / headless path** (`rollHeadless`) is already self-consistent — unchanged.

## Acceptance criteria seeds (for #97 implementation)
- [ ] `recordFromPhysical(results, notation)` pure + unit-tested with fixtures incl. the
      captured `8d6!` explosion (`2.1:5`) → record shows `…8 dice… + 5`, total = physical sum.
- [ ] For exploding/reroll rolls, every recorded value **equals the physical die**, and
      `total == sum(shown kept) + modifier`.
- [ ] Round grouping (one `+` per round, #96) still correct, driven by `rollId`.
- [ ] Plain + keep/drop (advantage) unchanged and correct.
- [ ] In-browser verification across `8d6!`, `1d6!` chains, `2d20kh1`, `4d6kh3`.
