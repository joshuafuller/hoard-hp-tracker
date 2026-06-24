# Hoard — Product Requirements Document

**Status:** Living document (v1.2)
**Last updated:** 2026-06-24
**Owner:** Joshua Fuller
**Supersedes scope framing in:** [`docs/ux/single-character-hp-tracker.md`](./ux/single-character-hp-tracker.md) (which scoped only the HP tool; this PRD reframes the product around the suite)

> This is a living PRD, not a frozen spec. It captures *why* the product exists, *who* it
> serves, and the **rules that govern what gets built next** — so scope grows by decision,
> not by accident. Section 8 (Scope-Fit Test) is the load-bearing part: read it before
> proposing any feature.

---

## 1. Executive Summary

We're building **Hoard**, a gorgeous, fullscreen, offline-first PWA that acts as a **single
player's utility belt at the tabletop** — the fast, tactile tool you keep in your hand during
a session to do the small, frequent jobs the game throws at you. It started as a hit-point
tracker, then absorbed currency tracking, dice rolling, rests, death saves, concentration, and
guided onboarding **without losing its speed, its one-screen feel, or its offline guarantee**. The
goal: be the thing a player actually reaches for on their turn instead of mental math, a
spreadsheet, or three different apps.

---

## 2. Problem Statement

### Who has this problem?
A single player at a tabletop RPG session (primarily D&D 5e), phone in hand or flat on the
table, mid-game, under social time pressure.

### What is the problem?
The small, repeated bookkeeping tasks of play — *apply this damage, track this temp HP, did I
keep concentration, how much gold do I have, roll this die* — are individually trivial but
collectively friction-filled. Players juggle mental arithmetic, paper, and a patchwork of apps,
none of which are built for the **15-second turn window** in a noisy room. General-purpose
tools (calculator, notes, dice apps) aren't shaped for the table; full VTTs and character-sheet
apps are heavy, online, and built for the DM or the whole party, not the one player who just
needs to *do the thing and pass the turn*.

### Why is it painful?
- **Speed:** stacking `−5 / −1` taps to land on "9 damage" wastes the turn; fat-fingering the
  wrong direction leaves your HP silently wrong with no undo.
- **Cognitive load:** remembering edge rules (death saves, temp-HP absorption, concentration
  CON-save DCs) mid-game is exactly when people get them wrong.
- **Fragmentation:** HP in one place, coins on a sheet, dice in a different app — context
  switching at the worst moment.
- **Connectivity:** game tables are basements, game stores, and kitchens with bad Wi-Fi; a tool
  that needs the network fails when you need it.

### Evidence
Grounded in the user-centred discovery in [`docs/ux/single-character-hp-tracker.md`](./ux/single-character-hp-tracker.md):
the journey map shows friction clustering at **input** and **recovery** (the most frequent,
most time-pressured moments), while *display* and *rules-correctness* are already strengths.
The coin tracker was added because the same "track it at the table without a separate sheet"
need recurred for currency — direct evidence that the product's real job is **"player-side
table tasks,"** of which HP was simply the first.

---

## 3. Target Users & Personas

Carried forward from discovery; the product is built **for the player, not the DM**.

### Primary — Marcus, the Mid-Combat Player
- **Role:** runs one character; keeps the full sheet on paper or D&D Beyond.
- **Context:** phone in one hand, dice in the other, noisy room, ~15-second turn window.
- **Goals:** apply an exact number instantly; read state at a glance; never do arithmetic in
  his head; recover from a misclick.
- **Success:** *"Took 9 → three taps → done, and the orb shows I'm bloodied without reading the number."*

### Secondary — Priya, the Rules-Light Newcomer
- **Role:** newer player, still learning the rules.
- **Goals:** correct behaviour without thinking — death saves at 0, temp HP absorbing first,
  rests restoring the right amount, a nudge to roll concentration saves.
- **Success:** *"I dropped to 0 and the death-save pips just appeared. I didn't have to look anything up."*

### Explicit non-user — the DM tracking an encounter
A DM running many combatants / initiative / conditions is a **different product** (see §8/§9).
A DM using one instance for a single "big bad" is a tolerated degenerate case, not a design target.

### Job-to-be-done
> *When* I'm mid-session and the game demands a quick bookkeeping action, *I want to* do it
> instantly on a device already in my hand, *so I can* stay in the game and pass the turn
> without breaking flow or getting a rule wrong.

---

## 4. Strategic Context

- **Product thesis:** the unit of value is a **player-side "table task,"** done faster and more
  correctly than the alternatives. HP and coins proved the pattern; the product wins by owning
  more of these tasks while staying instant and offline.
- **Positioning:** *the single player's table companion* — narrower and faster than a VTT or
  character-sheet app, more game-aware than a calculator/notes/dice app. Lives in the gap
  between "general tool" and "heavyweight platform."
- **System bet (5e-first, generalizable):** lean into D&D 5e rules now (death saves, CON-save
  DCs, PP/GP/SP/CP, Hit Dice) because that's where the rules-correctness "safety net" value
  is sharpest — but keep each task's **domain core abstracted** so another system *could* be
  added later without a rewrite. Other systems are a non-goal **today**, not a closed door.
- **Why now / why this shape:** the coin addition already demonstrated scope pressure. Without an
  explicit framework, each new table task risks eroding what makes the tool good. This
  PRD exists to make that growth deliberate.
- **Distribution & cost:** zero-backend, static PWA on GitHub Pages + an optional one-command
  Docker self-host. No servers, no accounts, no per-user cost — the product can scale to any
  number of users for ~free, which is *why* "no accounts / local-only" is a strategic constraint,
  not just a privacy nicety.
- **Market sizing:** not formally sized; this is an open-source passion product, not a revenue
  line. TAM is "people who play 5e on a phone at the table." Success is adoption + delight, not ARR.

---

## 5. Solution Overview

Hoard is a **fullscreen, mobile-first, offline PWA** organized as a small set of **task modules**
that share one visual language and one fast interaction surface.

### 5.1 Current modules (shipped)
- **HP** — current / max / temporary HP with the Molten Hoard liquid orb, rules-led danger colour
  (healthy gold → bloodied red → critical), temp-HP overshield, orb drag for heal/damage, and a
  first-run drag hint; reads at a glance across a table.
- **Death saves** — three success / three failure pips, a d20 roll, revive / stabilize / dead;
  appear automatically at 0 HP; damage at 0 auto-counts a failure.
- **Rests & Hit Dice** — spend Hit Dice through the shared dice tray on a short rest; full recovery
  on a long rest; Hit Die size, pool, and CON modifier are editable.
- **Quick damage/heal keypad** — type an exact amount, apply as Damage / Heal / Temp in two
  interactions; steppers remain for nudges.
- **Undo** — revert the last HP change (fat-finger recovery).
- **Concentration** — toggle + automatic CON-save prompt on damage (DC = `max(10, ⌊damage/2⌋)`);
  clears on death / long rest.
- **Coins** — PP / GP / SP / CP with auto-conversion on spend, auto-distill to fewest coins
  (with a before→after confirmation), one-tap undo, and a retargetable coin keypad behind the
  radial hub.
  _(Electrum/EP intentionally omitted — rare in play; keeps the purse to four denominations.
  Reconciled to the shipped data model; maintainer decision, 2026-06-22.)_
- **Dice tray** — full-screen 3D physics tray for ad-hoc rolls, death saves, and Hit Dice; supports
  chips, typed Roll20-style notation, advantage/disadvantage, keep/drop, exploding/reroll notation,
  roll log, nat-1/20 flourish, and reduced-motion/headless fallback.
- **Radial hub** — one gold sigil opens coins, dice, About, sound, and concentration; secondary
  actions stay out of the HP path until needed.
- **Character name** — optional identity by the orb; discoverable through the guided tour and
  persisted locally.
- **Guided tour** — first-run/replayable onboarding with spotlight steps for naming, the HP orb,
  radial hub, and rests; install help remains a planned tour slice.
- **About / release surface** — source link, share action, build/version identity, in-app "What's
  new", and the subtle "Updated to vX" toast after silent PWA updates.
- **Feel** — cohesive synth sound palette, audible/felt heartbeat, death-save pip cues, temp-HP
  shimmer, optional mutable sound, and haptics on supported devices.

### 5.2 The module pattern (how scope grows safely)
Every task module follows the same shape, which is what keeps the product coherent as it grows:
1. **Pure domain core** in `src/domain/` — all rules, fully unit + property tested, no UI.
2. **Presentational UI** in `src/ui/` — dumb components driven by props.
3. **A persisted state slice** via a Dexie store hook (`src/store/`), versioned with a migration.
4. **An entry surface** — the proven **switchable console** pattern (one keypad that retargets
   across actions/denominations) or the shared contextual dice tray, rather than a bespoke control
   per task.
5. **An unobtrusive launcher** — secondary tasks live behind the radial hub, never crowding HP.

A new task is "just another module" plugged into this pattern — that's the extensibility model.
See the keypad, coin console, radial hub, and dice tray as the reference implementations.

### 5.3 Non-Functional Requirements (NFRs)
These hold for **every** module and are a precondition for shipping, not per-feature niceties.

- **Platform / layout:** phone-first, fullscreen portrait, **installable PWA**. Core paths are
  one-handed and respect the **one-screen thumb-reach budget**. The shipped responsive strategy is
  phone-fill, tablet card, and landscape reflow, with no content clipping on target viewports
  (safe-area-inset aware; enforced by Playwright layout guards).
- **Performance:** fast cold start, small bundle/install size that stays small as modules are
  added, smooth orb rendering, lazy-loaded 3D dice, and interactions that feel instant within a
  ~15-second turn.
- **Offline:** **fully functional with no network** — service-worker precache of the app shell
  (incl. fonts/icons and vendored dice assets) and **zero third-party/CDN requests at runtime**.
- **Persistence:** local-only via Dexie/IndexedDB, **versioned with migrations**; HP, coins, name,
  concentration, Hit Dice, and dice history survive reload and sessions. Critical writes surface
  save failures; dice history is a best-effort side log. No data leaves the device.
- **Accessibility:** controls carry accessible names (`aria-label`s); editable values support
  keyboard interaction (Enter commits / Escape cancels) with visible `:focus-visible` states;
  dialogs trap/restore focus; text meets legible **contrast** against the obsidian background; tap
  targets meet a sane minimum size; motion/feedback respects `prefers-reduced-motion`; and
  meaningful state changes (HP tier, death saves) are perceivable by more than colour alone.
- **Privacy & cost:** no accounts, no tracking/telemetry, no backend; static build, plus a
  one-command Docker self-host.

NFR regressions are release-blocking the same way a failing rules test is.

### 5.4 Dice module — shipped and hardening
Passes the Scope-Fit Test (§8): single-player, at-the-table, offline, one-screen, and traces to
real friction (players reach for a separate dice app; death saves / Hit Dice already roll
internally). The shipped target is physics-based 3D dice, with a headless fallback for reduced
motion or unavailable WebGL.
- **Engine (decided, proven via a spike):** [`@3d-dice/dice-box`](https://github.com/3d-dice/dice-box)
  (BabylonJS + Ammo physics; ships its own meshes/themes; gold-tinted to match) +
  [`@3d-dice/dice-parser-interface`](https://github.com/3d-dice/dice-parser-interface) for the full
  Roll20 notation (advantage `2d20kh1`, disadvantage `2d20kl1`, keep/drop, exploding `!`, reroll,
  success counts, fudge, math). Spike: [`docs/spikes/dice-roller/`](spikes/dice-roller/).
- **Interface:** full-screen "table throw" from the radial hub; choose via chips or typed notation;
  total + per-die result + roll history; tap to clear. Death-save d20s and short-rest Hit Dice roll
  through this same tray (one shared mechanic).
- **Constraints carried from the spike:** lazy-load the engine on first open; self-host + precache
  assets for offline; record each roll as `{notation,total,result,dice[]}`; keep gameplay outcomes
  independent from best-effort history persistence.
- **Current hardening:** explode+keep/drop composition and WebGL reconcile are still tracked by
  #108 / #186; dice sound/effects polish remains in #83 / #90 / #91.

---

## 6. Success Metrics

**Measurement constraint (important):** because the product is **local-only with no accounts and
no telemetry by design**, we cannot measure classic product analytics (DAU, funnels). Success is
therefore tracked through **proxy, observable, and engineered signals** — and we accept that as a
deliberate trade for the privacy/offline guarantee.

### Primary signal — task speed & correctness
- **Turn-time:** a core action (e.g. "apply 9 damage") completes in **≤ 3 taps**, no OS keyboard.
  *Verified by:* the e2e interaction-count test (`e2e/interactions.spec.ts`, issue #53), which
  drives damage and heal from the default screen, counts the actual taps (open keypad, enter amount,
  apply), asserts the budget, and confirms the keypad carries no text input. The test goes red if a
  future change adds a tap to the core path.
- **Rules-correctness:** 5e edge rules (temp-HP absorption, death saves, concentration DC, Hit Dice,
  coin conversion/distill, dice notation/reconcile) provably correct. *Verified by:* pure-domain
  unit + property tests, targeted UI/e2e tests, and the mutation-testing gate (>= 90% domain score).

### Secondary signals
- **PWA quality:** Lighthouse PWA/installability passing; first load cached; cold start fast.
- **Offline integrity:** app fully functional with the network off, **zero third-party requests**
  at runtime.
- **One-screen budget:** no bottom clipping across target phone/tablet/landscape viewports.
- **Flow coverage:** Playwright covers HP action budget, coins, radial hub, dice, rests, persistence,
  offline/PWA, concentration, and layout.
- **Adoption proxies (best-effort):** GitHub stars/forks, issue/feature engagement, self-reported
  table use. Explicitly soft — not optimized for.

### Guardrail metrics (must not regress)
- Time-to-first-meaningful-paint / install size stay small as modules are added.
- Domain mutation score stays ≥ the break threshold.
- No feature introduces a network dependency or an accounts requirement.

---

## 7. Requirements & Backlog

Format follows the discovery doc: MoSCoW priority + Fibonacci weight. Acceptance criteria for
active work live on their **GitHub issues** (every issue carries checkbox AC).

### 7.1 Shipped ✅
HP lifecycle (current/max/temp, tiered orb), death saves, rests + Hit Dice, quick damage/heal
keypad, undo, concentration + CON-save prompt, coins (convert + auto-distill + unified console),
optional character name, radial hub, 3D dice tray + roll log, guided-tour engine and initial tour
steps, in-app What's New, share link, update toast, haptics + sound + heartbeat, responsive layout,
offline PWA + Dexie persistence, release-please versioning, Docker self-host, docs/repo tidiness,
and the expanded Playwright e2e suite.

### 7.2 Active / planned (tracked in issues)
| Issue | Title | Priority | Weight |
|------:|-------|----------|:------:|
| #290 | iOS Safari Dexie liveQuery updates do not propagate reliably | Must | 3 |
| #108 | Dice: exploding + keep/drop composition | Must | 3 |
| #186 | Dice reconcile test / WebGL-only modifier composition | Must | 3 |
| #161 | Expand Playwright into proper user-flow QA | Should | 8 |
| #168 | In-app guided feature tour / onboarding epic | Should | 8 |
| #180 | Tour: install-on-phone step | Should | 3 |
| #154 | In-app install help tutorial | Should | 5 |
| #90 | Cohesive sound design across the app | Should | 5 |
| #83 | Dice roll sound real-device tuning | Could | 3 |
| #95 | Improve Temp HP presentation | Could | 3 |
| #91 | Burning/dissolve dice effect | Could | 8 |
| #86 | Burning/dissolve dice spike | Could / needs decision | 3 |
| #216 | Beta service-worker tombstone | Could | 2 |
| #199 | Narrated README hero/explainer video | Could | 5 |
| #33 | Blocked esbuild advisory / wait for safe Vite path | Blocked | 3 |
| #205 | Explore same-network shared rolls | Explore / needs decision | TBD |

### 7.3 Candidate modules
- **Guided onboarding / install help** — tour engine and first steps are shipped; the install-on-phone
  step remains open (#180/#154).
- **Same-network shared rolls** (#205) — exploration only. It must preserve the no-account,
  no-cloud, table-local model or fail §8.
- Other player-side tasks that pass §8 (e.g. spell-slot / resource ticks, conditions-on-self) —
  each must clear the Scope-Fit Test before becoming an issue.

---

## 8. Scope-Fit Test  ⟵ *the rule that governs growth*

**A feature may join Hoard only if it passes ALL FOUR gates.** If it fails any gate, it belongs to
a different product (see §9) or doesn't belong at all. This is the explicit answer to "scope crept
once and will again."

1. **Single-player & at-the-table.** It's something **one player** needs **during a live
   session** — not DM tooling, not party/encounter management, not session prep.
2. **Offline + one-screen + fast.** It works **fully offline**, fits the **one-screen
   thumb-reach budget**, and is usable inside a **~15-second turn**. No feature may push content
   off the bottom or require the OS keyboard for its core path.
3. **No accounts / data stays on device.** No backend, no login, no cloud sync required.
   Local-only persistence (Dexie/IndexedDB) with a versioned migration.
4. **Earns its place via real friction.** It traces to an **observed player pain point** (like the
   journey map), not "nice to have." Prefer features that fold into the existing console/feel.

**Process:** a candidate that passes is captured as a GitHub issue with checkbox AC and a Fibonacci
weight, then follows brainstorm → spec → plan → TDD → PR into `main` → review → merge (which deploys).
A candidate that fails is recorded in §9 or §11 with the reason.

---

## 9. Out of Scope (and why)

These are **deliberately not** Hoard, mostly because they fail Gate 1 (single-player/at-table):

- **Multi-character / party / encounter tracking, initiative & turn order, a conditions library,
  cross-creature resource tracking.** This is the separate **multi-character encounter tracker** —
  a different product in scale. Keeping Hoard to one character is what lets it stay gorgeous and fast.
- **DM/prep tooling** (monster stat blocks, campaign notes, loot generation).
- **Accounts, cloud sync, cloud-backed multi-device sharing, Internet multiplayer.** Fails Gate 3;
  also the zero-backend model is a strategic asset. Same-network shared rolls are only an
  exploration (#205) and must preserve the no-account/no-cloud model to stay in scope.
- **Full character sheet / rules engine / leveling.** That's D&D Beyond's job; Hoard complements it.
- **Game content** (spells, monsters, items). The app **ships no copyrighted game content** by design.
- **Non-5e system support — for now.** Not built today, but the domain is kept abstract so it's a
  future option, not a rewrite (see §4).

---

## 10. Dependencies & Risks

### Architecture / dependencies
- React 19 + Vite + TypeScript (strict), Vitest + fast-check, `vite-plugin-pwa` (Workbox), Dexie
  (IndexedDB). Pure domain core in `src/domain/`; presentational UI.
- CI: **required to merge `main`** = `lint · typecheck · test · build` + `domain mutation testing`
  (≥ 90%) + the **Playwright e2e workflow** (made a required gate in #176).
  **Deploy** runs post-merge. The project is **main-only**: PRs target `main` (protected); the former
  `beta` → `/beta/` Pages sub-app has been retired.

### Risks & mitigations
| Risk | Mitigation |
|------|-----------|
| **Scope erosion** — features dilute speed/one-screen feel | The §8 Scope-Fit Test as a hard gate; secondary tasks live behind the radial hub |
| **One-screen budget breaks** as modules grow | Playwright layout/e2e guards at target viewports; budget is a Gate-2 requirement |
| **Offline regressions** (e.g. network font or dice asset) | Precache + zero third-party requests; Gate 2 |
| **CI slows as suite grows**, hurting the TDD loop | Cached installs/browsers and focused gates; scope mutation testing to domain |
| **5e-only domain ossifies**, blocking generalization | Keep rules in abstracted pure cores; resist 5e assumptions leaking into UI/state |
| **No telemetry** → flying blind on usage | Accept by design; lean on proxy signals (§6) and direct user feedback |

---

## 11. Open Questions

- **Tour depth:** after the shipped first-run tour, how much install help belongs in-app vs. docs?
- **Generalization trigger:** what concrete demand would justify investing in non-5e support?
- **Shared rolls:** can same-network shared rolls pass the no-account/no-cloud model, or is it a
  different product?
- **Settings surface:** as toggles accumulate (sound, haptics, future), when do we add a settings panel?
- **Dice depth:** saved roll presets / macros are still uncommitted; they must prove table friction
  before joining the backlog.

---

## 12. Changelog — scope evolution
- **v1 (2026-06-19):** First PRD. Reframed the product from "single-character HP tracker" to
  "single player's table companion" with an explicit module pattern and Scope-Fit Test, prompted by
  the coin-tracker scope addition and an anticipated dice module. Closes issue #46.
- **v1.1 (2026-06-20):** Molten Hoard redesign shipped (smooth-gold orb, gold-medallion controls,
  charcoal card, orb-as-input drag, living aura). **3D dice roller committed** as the next module
  after a proven spike (dice-box + dice-parser-interface; full Roll20 notation) — §5.3, #73 + #75;
  spike saved under `docs/spikes/dice-roller/`.
- **v1.2 (2026-06-24):** Backported shipped scope through v0.0.14: radial hub, 3D dice tray, expanded
  e2e coverage, release/version story, in-app changelog, guided-tour engine + initial steps,
  responsive layout, haptics/sound/heartbeat, persistence hardening, Docker/tooling cleanup, and
  current open backlog.
