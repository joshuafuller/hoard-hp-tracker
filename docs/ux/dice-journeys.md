# Dice — User Stories & Journeys

**Status:** Draft for review · feeds #73 (spec/AC) and #75 (build)
**Owner:** Joshua Fuller · **Last updated:** 2026-06-20
**Reads with:** [`docs/PRD.md`](../PRD.md) §5.3 · the proven spike [`docs/spikes/dice-roller/`](../spikes/dice-roller/)

> This is the *experience* spec for dice — who rolls, why, and what "outstanding" means at the
> table — written **before** the build so #73's acceptance criteria distill straight out of it.
> It is a conversation starter, not a frozen contract (Cohn + Gherkin format).

---

## 1. What "outstanding" means for dice

Dice live or die on the **hero path**: a single player throwing **`1d20 + mod`**, very often with
advantage/disadvantage, mid-combat, in a noisy room, on the device already in their hand. That one
flow being instant — *token → die → throw → read total **and** result → gone* — **is** the
experience. Everything else (damage dice, special modes, notation) hangs off that spine.

Five principles, each traceable to a Scope-Fit gate (PRD §8) and the journey map's friction at
**input** and **recovery**:

1. **Zero-typing core path.** Die chips + a one-tap advantage/disadvantage toggle do ~80% of rolls.
   Typed Roll20 notation is a *secondary escape hatch* for experienced players, never the default —
   the OS keyboard is banned from the core path (NFR §5.4, Gate 2).
2. **Read it without thinking.** Every roll shows the **total**, the **per-die result**, and the
   **notation** that produced it; dropped dice (advantage's low d20, 4d6-drop-lowest) are visibly
   struck, not silently removed. Glanceable across a table.
3. **Tactile, then gone.** Physics throw for delight; one tap clears the tray and you're back on the
   HP screen. The tray never traps you (inert when closed; tap-to-clear; ✕ to exit).
4. **Correct by default (the safety net).** The rolls the app *already owns* — death-save d20,
   short-rest Hit Dice — throw through this same tray and apply their own outcome, so a newcomer
   never has to know the rule. (Shared-mechanic refactor — see §6, a careful fast-follow.)
5. **Always works.** Lazy-loaded on first open (Babylon is heavy — HP screen stays instant), fully
   offline (self-host + precache assets, #45), and `prefers-reduced-motion` gets an **instant-settle**
   path that skips the tumble but keeps the result.

---

## 2. Personas, at the dice tray

Carried from PRD §3 — **no new personas**. Notation power-use is just *experienced Marcus*, not a
third archetype.

- **Marcus — the Mid-Combat Player (primary).** Phone in one hand, ~15-second turn. Needs an
  attack/check/save *now*, usually `d20 + mod`, frequently with advantage. As he gets fluent he
  reaches for the notation field for damage dice (`2d6+3`) and the odd special roll. Success:
  *"Advantage attack — two taps, 23, and I called it out before the DM finished asking."*
- **Priya — the Rules-Light Newcomer (secondary).** Doesn't know the notation and shouldn't need to.
  Wants the die she was told to roll and the right thing to happen — especially when she's at 0 HP or
  resting and the *app* knows the rule she doesn't. Success: *"It rolled my death save for me and
  ticked the pip. I didn't look anything up."*

---

## 3. Journeys (end-to-end)

### Journey A — Advantage attack mid-combat *(the hero path; optimize everything for this)*
Marcus's turn. He taps the **d20 token** in the chrome → the app dims and the whole screen becomes a
transparent dice tray. He taps the **d20** chip, taps **Advantage** (now `2d20kh1`, no typing), sets
**+5**, and flicks to throw. Two dice tumble over his dimmed orb; the kept die glows, the dropped one
is struck. He reads **23** (total) and **18 ▸ +5** (result), says it aloud, taps the tray to clear,
and he's back on HP. **Whole thing under ~3 seconds, zero keyboard.**

### Journey B — Priya drops to 0 *(the safety net; rules-correctness)*
A hit takes Priya to 0. Death-save pips appear automatically (already shipped). On her turn she taps
**Roll death save** — the *same* tray throws one d20, settles on **14**, and the app **ticks a
success pip itself** (≥10), explaining nothing she has to know. A 20 revives at 1 HP; a 1 marks two
failures. She never typed, never looked up a rule. *(Routes the existing death-save d20 through the
tray — §6.)*

### Journey C — Short rest, spend a Hit Die *(recovery)*
Marcus takes a short rest, opens Hit Dice, and spends one. The die throws through the tray (e.g.
`1d10`), settles on **7**, and the app **offers to apply 7 + CON as healing** to his orb — one
confirm and his HP rises. The roll is recorded. *(Routes the existing Hit Dice roll through the tray
and into HP — §6; this is the clearest case of the dice↔HP link in §5.)*

### Journey D — Weapon damage (read-aloud) vs. a healing spell (apply)
Marcus hits, opens the tray, picks **2d6** + **3** (or types `2d6+3` once he's fluent), throws,
reads **11**, and **calls it to the DM** — Hoard tracks *his* HP, not the monster's, so a damage-dealt
roll is **informational only**. But when he casts Cure Wounds and rolls `1d8+3`, the tray recognizes a
**heal-to-self** intent and offers **"Apply 7 as heal"** into his orb. *(This split is the proposed
dice↔HP rule — §5, a decision to ratify.)*

### Journey E — "Wait, what did I just roll?" *(recovery / trust)*
Mid-argument about a number, Marcus glances at the **roll history** in the tray — the last several
rolls with notation + result, newest first — confirms his **18 ▸ +5 = 23**, and moves on. History
persists across the session so he can reopen the tray and check. No re-roll needed to remember.

### Journey F — Quiet table / motion-sensitive *(accessibility, Gate 2)*
Priya plays in a library group and has reduced-motion on. She rolls; the dice **settle instantly**
(no tumble, no sound if muted) but she still gets the full **total + per-die result**. The feature is
not gated behind an animation she can't use.

---

## 4. User stories (Cohn + Gherkin) — ordered by table frequency

### US-D1 — Ad-hoc d20 roll *(hero path; highest frequency)*
- **Summary:** Throw a `d20 + mod` in two taps and read the result without a keyboard.
- **As** Marcus, mid-combat, **I want to** throw a single d20 with a modifier from die chips,
  **so that** I get my attack/check/save number instantly and pass the turn.
- **Acceptance Criteria**
  - **Given** I'm on the HP screen **and** I tap the d20 token, **When** the tray opens, **Then** I
    can pick a d20 and a modifier and throw **without the OS keyboard appearing**.
  - **and** the result shows the **total**, the **per-die value**, and the **notation** (e.g.
    `1d20+5 → 18 ▸ +5 = 23`).
  - **and** the whole path (open → throw → read) is **≤ 3 interactions**.

### US-D2 — Advantage / disadvantage as a one-tap toggle *(very high frequency)*
- **Summary:** Toggle advantage/disadvantage without knowing `2d20kh1`.
- **As** Marcus, **I want to** toggle advantage or disadvantage with one tap, **so that** I roll the
  5e-correct two-d20-keep-highest/lowest without typing notation.
- **Acceptance Criteria**
  - **Given** a d20 is selected, **When** I tap **Advantage**, **Then** two d20 are thrown, the kept
    die is highlighted and the dropped die is visibly struck, and the notation reads `2d20kh1` (+mod).
  - **and** **Disadvantage** does the same with keep-lowest (`2d20kl1`); tapping again clears back to
    a single d20.

### US-D3 — Multi-die damage roll, read-aloud *(high frequency)*
- **Summary:** Roll weapon damage (e.g. `2d6+3`) and read the total to call to the DM.
- **As** Marcus, **I want to** throw multiple dice of one type plus a modifier, **so that** I can
  read my damage total aloud.
- **Acceptance Criteria**
  - **Given** the tray is open, **When** I pick a die count, a die type, and a modifier and throw,
    **Then** I see each die's face, the modifier, and the summed total.
  - **and** a damage-dealt roll is **informational only** — it does **not** change my HP.

### US-D4 — Recorded roll model + history *(trust / recovery)*
- **Summary:** Every roll is recorded so I can re-read it.
- **As** Marcus, **I want to** see my recent rolls, **so that** I can confirm a number I already
  threw without re-rolling.
- **Acceptance Criteria**
  - **Given** I have rolled at least once, **When** I look at the tray, **Then** I see a history of
    recent rolls (newest first) each showing notation + per-die result + total.
  - **and** each roll is recorded as `{notation, total, result, dice[]}` (per the spike) and persists
    for the session.

### US-D5 — Death save through the shared tray *(safety net; Priya)*
- **Summary:** Roll a death save in the tray and have the app apply the outcome.
- **As** Priya at 0 HP, **I want to** roll my death save in the dice tray, **so that** the success/
  failure is recorded for me without my knowing the rule.
- **Acceptance Criteria**
  - **Given** I'm at 0 HP with death saves showing, **When** I roll the death save, **Then** one d20
    throws in the tray and the app marks a success (≥10) or failure (<10) pip itself.
  - **and** a natural 20 revives me to 1 HP and a natural 1 marks two failures.
  - *(Depends on §6 shared-tray refactor.)*

### US-D6 — Hit Die through the shared tray, into HP *(recovery; dice↔HP)*
- **Summary:** Spend a Hit Die in the tray and apply the roll as healing.
- **As** Marcus on a short rest, **I want to** roll a spent Hit Die in the tray, **so that** the
  result heals me without manual math.
- **Acceptance Criteria**
  - **Given** I spend a Hit Die, **When** it rolls in the tray, **Then** I'm offered to apply
    `roll + CON modifier` as healing to my HP, and confirming raises my current HP (capped at max).
  - **and** the roll is recorded in history.
  - *(Depends on §5 dice↔HP decision + §6 refactor.)*

### US-D7 — Notation escape hatch *(experienced Marcus; lower frequency)*
- **Summary:** Type full Roll20 notation for anything the chips don't cover.
- **As** an experienced player, **I want to** type a notation string, **so that** I can roll
  compound or special expressions (`2d6+1d4+3`, `3d6!`, `4dF`, `6d6>4`, `4d6kh3`).
- **Acceptance Criteria**
  - **Given** the notation field, **When** I enter a valid Roll20 expression and throw, **Then** the
    correct dice are thrown and the result reflects keep/drop, exploding, reroll, success-count, and
    fudge per the spike's proven table.
  - **and** this field is **secondary** — never required for the d20/advantage/damage core paths.

### US-D8 — Offline & reduced-motion *(NFR; Gate 2 & 3)*
- **Summary:** Dice work offline and respect reduced motion.
- **As** any player, **I want to** roll with no network and (if I prefer) no animation, **so that**
  the table tool never fails me.
- **Acceptance Criteria**
  - **Given** the device is offline, **When** I open the tray and roll, **Then** it works fully (no
    third-party/CDN request at runtime; assets precached — #45).
  - **and Given** `prefers-reduced-motion`, **When** I roll, **Then** the dice settle instantly
    (no tumble) but I still get the full total + per-die result.
  - **and** the engine loads **lazily on first open**, never on app start.

---

## 5. Decision to ratify — dice ↔ HP integration

PRD §11 lists *cross-task state* as an **open question**. The journeys propose a concrete rule:

> **Healing-type rolls flow back into the tracker; damage-dealt rolls stay informational.**
> Hoard tracks only *the player's own* HP, so: Hit Dice, healing spells (`1d8+mod`), and death saves
> may apply their outcome to HP/death-save state. A weapon-damage roll is read-aloud to the DM and
> changes nothing in Hoard.

This is the highest-leverage product call here and it **changes build scope** (US-D5, US-D6 depend on
it). **Needs Josh's ratification before #75 builds it.** If declined, dice ships as a pure roller and
the death-save/Hit-Dice routing (§6) is deferred.

---

## 6. Refactor note — "one shared tray" touches shipped code

The PRD's "one shared mechanic" (death-save d20 + Hit Dice through the new tray) is a **refactor of
working, tested features**, not greenfield. The e2e layout guard already bit once on a control change,
so this carries regression risk. **Treat it as a careful, separate fast-follow** (its own PR, its own
red-green tests) **after** the standalone tray lands — not bundled into the first slice.

---

## 7. Proposed first slice (of weight-8 #75)

#75 is too big for one PR. Ordered by value, the first shippable slice is the **hero path**:

1. **Table-throw tray** — lazy-loaded full-screen overlay; d20 token entry from the chrome; inert
   when closed; tap-to-clear / ✕ to exit. *(US-D1)*
2. **Zero-typing core rolling** — die chips + modifier + **one-tap advantage/disadvantage**, showing
   total + per-die + notation, dropped dice struck. *(US-D1, US-D2)*
3. **Recorded model + session history** — `{notation, total, result, dice[]}`. *(US-D3, US-D4)*
4. **Offline + reduced-motion** — precache assets (#45), instant-settle path. *(US-D8)*

**Deferred to later slices:** notation escape hatch polish (US-D7 — engine already supports it),
death-save/Hit-Dice routing + dice↔HP (US-D5, US-D6, §5/§6), radial-purse entry (#74).

Each slice: brainstorm → spec (#73 AC) → plan → TDD → PR into `beta` → review → promote to `main`.
