# UX Discovery — Single-Character HP Tracker

**Status:** Draft for review
**Scope:** the shipped single-character HP tracker
**Last updated:** 2026-06-14

---

## 1. Overview & Scope

The HP Tracker is a mobile-first, fullscreen PWA for tracking **one creature's hit
points** at a tabletop game. It is the first tool in a planned suite and sets the
visual + interaction pattern for the rest.

This document captures the user-centred discovery behind the tool: who uses it, how
they move through a session, and the friction that analysis surfaces. It exists so
feature decisions trace back to a real user need rather than to "make the buttons
nicer."

**In scope** — one character/creature's HP lifecycle during play:
damage, healing, temporary HP, death saves, short/long rests, Hit Dice.

**Out of scope (deliberate)** — multiple combatants, initiative order, a conditions
library, spell-slot/resource tracking. These belong to the larger multi-character
"encounter" product and are tracked separately (see [§6](#6-out-of-scope--future)).

---

## 2. User Personas

### Persona A — Marcus, the Mid-Combat Player *(primary)*

> "Just tell me my HP and let me change it fast. It's my turn and everyone's waiting."

| Attribute | Details |
|-----------|---------|
| **Role** | A player running one character; keeps the full sheet on paper or D&D Beyond. |
| **Context of use** | Phone in one hand or flat on the table, dice in the other, noisy room, his turn is a 15-second window. |
| **Goals** | Apply an exact damage/heal number instantly; read his HP at a glance from across the table; never do arithmetic in his head. |
| **Frustrations** | Tapping `−5 / −1` several times to land on one number; fat-fingering the wrong direction with no way back; losing track of temp HP. |
| **Tech comfort** | High. Expects app conventions (type a number, undo) to "just work." |
| **Success looks like** | "Took 9 → two taps → done, and the orb shows I'm bloodied without me reading the number." |

### Persona B — Priya, the Rules-Light Newcomer *(secondary)*

> "I don't remember how death saves work — can the app just handle it?"

| Attribute | Details |
|-----------|---------|
| **Role** | A newer player, second campaign, still learning the rules. |
| **Context of use** | Leans on the tool as a safety net so she doesn't have to memorise edge rules mid-game. |
| **Goals** | Correct behaviour without thinking: death saves at 0, temp HP absorbing first, rests restoring the right amount. |
| **Frustrations** | Tools that assume rules knowledge; silent mistakes she can't tell happened. |
| **Tech comfort** | Medium. Wants clear, guided states over dense controls. |
| **Success looks like** | "I dropped to 0 and the death-save pips just appeared. I didn't have to look anything up." |

### Edge user — the DM's single "big bad"

A DM occasionally uses one instance to track a single important monster. Real value,
but it is a *degenerate case of the multi-combatant product*, not a reason to add
combat-tracker scope here. Noted, not designed for.

---

## 3. User Journey Map

One combat encounter, from **Marcus's** point of view. Emotions: 🙂 smooth · 😐 neutral · 😣 friction.

| Stage | User action | Thoughts / needs | Emotion | Pain point | Opportunity |
|-------|-------------|------------------|---------|-----------|-------------|
| **Setup** | Opens the app | "Is my HP where I left it?" | 🙂 | — | Persistence already works |
| **Take a hit** | "9 slashing" — taps to subtract 9 | "Just let me enter 9" | 😣 | `−5 −1 −1 −1 −1` = five taps for one number | **Quick damage/heal keypad** |
| **Misclick** | Hits `+` instead of `−` | "No — undo that!" | 😣 | No way to revert; HP is now wrong | **Undo last change** |
| **Concentration** | Casts *Bless*, keeps it up | "I need to remember I'm concentrating" | 😐 | No concentration state at all | **Concentration toggle** |
| **Hit while concentrating** | Takes damage | "Do I roll a CON save?" | 😣 | No reminder; easy to forget the rule | **CON-save prompt on damage** |
| **Get healed** | Cleric heals 11 | "Add exactly 11" | 😣 | Same stepper clunk on the heal side | Keypad covers heal too |
| **Gain a ward** | *false life* grants 9 temp | "Set my temp to 9" | 😐 | Separate flow from the main input | Fold **Temp** into the keypad |
| **Drop to 0** | HP hits 0 | "What now?" | 🙂 | — | Death-save pips appear automatically ✅ |
| **Hit while down** | Takes damage at 0 | "That's a failure, right?" | 🙂 | — | Auto-counts a death-save failure ✅ |
| **Glance** | Looks from across the table | "Am I bloodied?" | 🙂 | — | The tiered liquid orb reads instantly ✅ |
| **Between fights** | Short rest, spends a Hit Die | "Restore some HP" | 🙂 | — | Hit Dice + rests handled ✅ |
| **Next session** | Reopens next week | "Pick up where I was" | 🙂 | — | Local persistence ✅ |

**Reading the map:** the tool is strong at *display* and *rules correctness* (the right
half of the journey is green). The friction clusters at *input* and *recovery* —
exactly the moments that happen most often and under the most time pressure.

---

## 4. User Stories

Format: **As a** _persona_, **I want** _capability_, **so that** _outcome_.
Priority uses MoSCoW. Estimate is a Fibonacci weight. Status marks what already ships.

### Already delivered ✅

| ID | Story | Status |
|----|-------|--------|
| US-D1 | As Priya, I want death saves to appear automatically at 0 HP, so that I don't have to remember the rule. | ✅ Shipped |
| US-D2 | As Priya, I want taking damage at 0 HP to count as a death-save failure, so that the table stays honest. | ✅ Shipped |
| US-D3 | As Marcus, I want temp HP to absorb damage first, so that the maths is correct without thought. | ✅ Shipped |
| US-D4 | As Marcus, I want short/long rests with Hit Dice, so that recovery between fights is one tap. | ✅ Shipped |
| US-D5 | As Marcus, I want my HP to read at a glance (colour + level), so that I know my state without reading digits. | ✅ Shipped |
| US-D6 | As Marcus, I want my HP to persist across sessions, so that I resume where I left off. | ✅ Shipped |

### Proposed (this discovery)

#### US-1 — Quick damage/heal entry · **Must** · weight 5
**As** Marcus, **I want** to type an exact amount and apply it as damage or healing in
one or two taps, **so that** I'm not stacking stepper presses on my turn.

*Acceptance criteria*
- A numeric keypad entry applies an arbitrary amount as **Damage** or **Heal**.
- Damage routes through the existing rule (temp HP absorbs first).
- Entering `9` + **Damage** takes exactly 9; two interactions for any value.
- The `±1 / ±5` steppers remain for quick nudges (additive, nothing removed).
- Works one-handed, fullscreen; no reliance on the OS keyboard.

#### US-2 — Undo the last change · **Must** · weight 3
**As** Marcus, **I want** to undo my most recent HP change, **so that** a fat-finger in
combat doesn't leave my HP wrong.

*Acceptance criteria*
- A visible **Undo** reverts the last damage/heal/temp/set action to the prior value.
- At least one level of undo; surviving a page refresh is a bonus, not required.
- Undo is discoverable at the moment of error (near the controls).

#### US-3 — Concentration tracking + save prompt · **Should** · weight 5
**As** a concentrating caster, **I want** to mark that I'm concentrating and be prompted
to roll a CON save when I take damage, **so that** I don't forget to check whether the
spell drops.

*Acceptance criteria*
- A concentration toggle with a clear on/off state.
- On applying damage while concentrating, prompt the save DC = `max(10, ⌊damage/2⌋)`
  (half the damage **rounded down**, per 5e — so the DC stays 10 until damage ≥ 22).
- Resolving or dropping concentration is one tap; clears on death/long rest.

#### US-4 — Character identity · **Could** · weight 2
**As** Marcus, **I want** to set my character's name, **so that** the screen feels like
mine and is identifiable if I set the phone down.

*Acceptance criteria*
- Optional editable name shown with the orb; blank by default (no forced setup).
- Persists with the rest of the state.

#### US-5 — Temp HP via the keypad · **Should** · weight 1
**As** Marcus, **I want** to set temporary HP from the same entry surface, **so that**
applying a ward is as fast as applying damage.

*Acceptance criteria*
- The keypad offers a **Temp** action that sets temporary HP to the entered amount.
- Follows the non-stacking rule already in the domain.

---

## 5. Derived Backlog

Ordered by value-to-effort from the journey. Weights are Fibonacci.

| ID | Title | Priority | Weight | Notes |
|----|-------|----------|--------|-------|
| US-1 | Quick damage/heal keypad | Must | 5 | Pair with US-2 (same interaction surface) |
| US-2 | Undo last change | Must | 3 | Cheap; high relief; ship with US-1 |
| US-5 | Temp HP via keypad | Should | 1 | Folds into US-1 |
| US-3 | Concentration + CON-save prompt | Should | 5 | The damage tap is the natural hook |
| US-4 | Character name | Could | 2 | Small identity win |

**Recommended first PR:** US-1 + US-2 (+ US-5) — one cohesive input/recovery surface.
Then US-3, then US-4. Each ships behind the established flow: feature branch → PR into
`beta` → review → merge.

---

## 6. Out of Scope / Future

The single most requested-sounding feature — "track the whole party / the monsters" —
is intentionally **not** here. It is a different product in scale (initiative order,
many combatants, conditions, per-creature identity) and is the **multi-character
encounter tracker**, the original `hoard` vision for which the HP orb is the seed
interaction. Keeping this tool tight is what lets it stay gorgeous and fast for the one
job it does.

Items deferred to that product: multiple combatants, initiative/turn order, a
conditions library (prone, poisoned, stunned…), and resource tracking (spell slots,
ki, etc.).
