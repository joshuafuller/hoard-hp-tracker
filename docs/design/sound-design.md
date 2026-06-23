# Sound Design — Hoard

> Spike deliverable for [#85](https://github.com/joshuafuller/hoard-hp-tracker/issues/85).
> Defines a cohesive, intuitive sonic identity for the whole app to guide implementation
> ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)).
> The audio sibling of [`DESIGN.md`](../../DESIGN.md) (Molten Hoard) — read that first.

Sound today is ad-hoc: per-feature synth cues added as needed ([`src/sound/sfx.ts`](../../src/sound/sfx.ts)).
This doc replaces that with a **strategic palette** — one material, four families, consistent
contour — so a sound *means something* before you look at the screen.

---

## 1. Sonic identity / material thesis

**The hoard makes its own sound.** Where Molten Hoard is *gold + gemstone rendered in light*,
the audio is **gold + gemstone rendered in resonance**: one warm, tactile material struck,
poured, and rung. Every cue should feel like it came off the same object the visuals depict —
a glowing pile of treasure on a dark table.

Three sonic motifs, mapped to the three visual ones:

| Visual motif | Sonic motif | Character |
|---|---|---|
| **Gold** (the hoard, identity, totals) | **Struck/rung metal** — warm bell, coin chime | Resonant, sustained, pure-ish (sine/triangle). Reward, identity, "you own something." |
| **Gem** (semantic state) | **Clear glass/crystal ping** | Bright, focused, short. State changes, confirmations, prompts. |
| **Ember** (warmth, the volcanic black) | **Low, soft thud / warm body** | Dark, damped, blunt (sawtooth/lowpassed). Weight, damage, loss, the floor under everything. |

**Through-line principles (the "of one material" test):**

- **Warm, never clinical.** Sines and triangles over square/harsh saw; gentle exponential
  decays, no clicks. Tuned to a consistent key center (see §3) so cues are consonant with each
  other, never a random pitch soup.
- **Tactile, not musical.** These are *object* sounds (a struck coin, dice on felt), not a
  jingle. Short. They complement haptics — the sound is what the haptic *would sound like*.
- **Glanceable-by-ear.** Like color reads before digits, a cue's **family** (up vs down, win vs
  loss) must read before its identity. Marcus, eyes elsewhere mid-combat, should know "that was
  good / that was bad / that was just a tap" from contour alone.
- **Never startling.** Dim room, social table. Peak gain stays low (≤ ~0.22), durations short,
  attacks soft. Sound is the quiet half of "the app talks back without being looked at."
- **Restraint = the gold rule.** Not every interaction earns a sound. Neutral taps stay nearly
  silent or haptic-only; loud/rung cues are *earned* by meaningful moments (heal, crit, death,
  long rest). Gold is not sprayed; neither is sound.

---

## 2. Category families

Four families. Each owns a **pitch register, timbre, and contour** so meaning is intuitive and
new cues slot in without re-thinking. This is the audio equivalent of the semantic color tokens.

| Family | Means | Contour | Pitch / register | Timbre | Color tie-in |
|---|---|---|---|---|---|
| **Positive** | Gain, success, restore | **Rising** (low→high) | Mid→high, major intervals | Warm bell (sine, two-note lift) | heal emerald / gold |
| **Negative** | Loss, failure, danger | **Falling** (high→low) | Low, downward glide | Damped thud / dark body (saw→lowpass) | damage ruby |
| **Neutral** | Acknowledgement, navigation | **Flat / single point** | Mid, one note | Soft tick (triangle), very quiet | ivory / hairline |
| **Transactional** | Coins, dice, discrete objects | **Granular / textural** | Mid-high, clustered | Noise/metallic clatter, plural ticks | gold (coins) / per-result color |

**Rules that make the families legible:**

- **Up = good, down = bad — always.** A rising interval is *never* used for a loss; a falling
  glide is *never* used for a gain. This is the single most important intuition to protect.
- **Brighter = more positive; darker = more negative.** Crits push to the extremes of their
  family (nat-20 = brightest, highest; nat-1 = darkest, lowest).
- **Quieter = more neutral.** Loudness encodes importance: a keypad tap (neutral) is the
  quietest thing in the app; death (negative, maximal) is the longest and most present.
- **Transactional cues are *textures*, not melodies** — they say "discrete objects moved"
  (coins, dice) regardless of good/bad; the *outcome* of a transaction (e.g. dice settle on a
  crit) borrows from positive/negative on top of the texture.

**Tonal center.** Anchor cues to **C major / A minor** (the existing heal cue is C5→G5, a
perfect fifth; stabilize is E5→B5). Keep new cues in this key so any two cues that overlap stay
consonant. Positive = major intervals up; negative = minor/down; neutral = a single anchor tone.

---

## 3. Event → sound map

Every meaningful event. **Status:** `EXISTS` (recipe in `sfx.ts` today) · `GAP` (specced here,
to build in #90) · `RECONFIG` (a cue exists but should be re-tuned/split).

Params use the same vocabulary as `sfx.ts`: waveform, frequency (or `a → b` glide), duration (s),
peak gain (0–1), and the **paired haptic**. Haptics are centralized in `src/sound/haptics.ts`
as named patterns (`haptic("tap" | "pip" | "roll" | "rollResult" | "commit" | "heartbeat")`) — a
guarded `navigator.vibrate` that **no-ops on iOS web** (Apple blocks it) and where unsupported.
Frequencies given as note names where they sit in the key center.

### HP & life state

| Event | Family | Status | Cue (waveform · freq · dur · gain) | Haptic | Notes |
|---|---|---|---|---|---|
| **Damage** | Negative | EXISTS | saw `150→70Hz` · 0.18s · 0.18 | `vibrate(10)` | Blunt ember thud. Scale gain subtly with damage size (cap ~0.22). |
| **Heal** | Positive | EXISTS | sine `C5→G5` two-note · 0.12+0.16s · 0.16 | `vibrate(10)` | Rising warm lift. The reference "positive" cue. |
| **Temp HP gained (ward)** | Positive | **GAP** | sine `G4 + D5` soft, slight detune shimmer · 0.18s · 0.12 | `vibrate(8)` | Sapphire ward — cooler/airier than heal, *not* a heal. Distinct so absorbing ≠ healing. |
| **Temp HP absorbs a hit** | Neutral→Neg | **GAP** | short damped `tick` over a muted thud · 0.10s · 0.10 | `vibrate(10)` | "Shield took it" — softer than a raw damage thud; reads as *deflected*. |
| **Down — drop to 0 HP** | Negative | **GAP** (split) | low knell `A2→F2` · 0.35s · 0.18 | `vibrate([14,36,14])` | Distinct from final death. Gravity, not finality — death saves begin. |
| **Death save — success pip** | Positive | **GAP** | single clear ping `E5` · 0.12s · 0.12 | `vibrate(8)` | One bright gem ping per pip; pitch can step up per success (E→G→B). |
| **Death save — failure pip** | Negative | **GAP** | low `E3` damped · 0.14s · 0.14 | `vibrate([14,36,14])` | Darker each failure (E3→C3→A2). |
| **Stabilize** | Positive | EXISTS | sine `E5→B5` chime · 0.16+0.22s · 0.16/0.14 | `vibrate(10)` | Reassuring rise. Reuse for "stabilized by save." |
| **Death (final / 3 failures)** | Negative | EXISTS | sine `A2→~C2` knell · 0.6s · 0.20 | `vibrate([14,36,14])` | The longest, most present cue. Earned finality. |
| **Revive / back from 0** | Positive | **GAP** | warm rising `C5→E5→G5` arpeggio · ~0.4s · 0.16 | `vibrate([12,30,12])` | Brighter, fuller than heal — a real lift. |
| **Cross into bloodied tier** | Negative (soft) | **GAP** | very soft low swell `~A3` · 0.2s · 0.08 | none | Subtle; pairs with the visual tier blend (#20). Never startling. Suppress under reduced-motion. |
| **Heartbeat (danger-zone pulse)** | Negative (tension) | EXISTS (#243/#245) | bass lub-dub: sine `62→38Hz` (S1) + `50→30Hz` (S2) ~0.16s apart · 0.16/0.13s · 0.2/0.13, **looped at `heartbeatBpm`** (~60bpm at half → ~150 near 0) | `vibrate([40,110,26])` (lub·gap·dub), looped per beat | The visual colour flush (#240), the bass audio (#243) and the felt buzz (#245) all pulse **together**, quickening as HP→0. Mute silences sound + buzz. iOS: the haptic no-ops (Apple blocks web `navigator.vibrate`). |

### Rests

| Event | Family | Status | Cue | Haptic | Notes |
|---|---|---|---|---|---|
| **Short rest = spend a Hit Die** | Positive (calm) | RECONFIG | sine `G4` warm · 0.22s · 0.14 | `vibrate(10)` | One event: the Short Rest button *is* "Spend a Hit Die" (`useHp.shortRest()` → `spendHitDie()`). Reconfigure the existing `shortRest` cue to a roll-and-recover feel — one die `tick` into the warm tone — since a die is actually rolled. **Not** a separate cue. |
| **Long rest** | Positive (calm) | EXISTS | sine `G4→D5` rising pair · 0.2+0.3s · 0.14 | `vibrate([12,30,12])` | Fuller, slower — a full restore. |

### Coins (transactional family)

| Event | Family | Status | Cue | Haptic | Notes |
|---|---|---|---|---|---|
| **Coin add (gain)** | Transactional + Pos | **GAP** | 2–3 bright metallic `ticks` rising · ~0.25s · 0.12 | `vibrate(10)` | Coins *into* the hoard — clink with an upward lilt. |
| **Coin spend** | Transactional + Neg | **GAP** | 2–3 metallic `ticks` falling · ~0.25s · 0.12 | `vibrate(10)` | Coins *out* — same texture, downward lilt. Mirror of add. |
| **Coin distill (auto-consolidate)** | Transactional | **GAP** | a short cascade of `ticks` settling to one ring · ~0.4s · 0.12 | `vibrate([8,20,8])` | Many coins → fewest coins: a "pour that settles." Satisfying, not loud. |

> Metallic ticks = the bandpass-noise `playTick` already used for dice, retuned brighter/coinier
> (higher center freq, shorter). One generator, two textures (coin vs die).

### Dice (transactional family + outcome layer)

| Event | Family | Status | Cue | Haptic | Notes |
|---|---|---|---|---|---|
| **Throw / tumble** | Transactional | EXISTS (#83) | noise `clatter`, 7 ticks tapering · ~0.55s · 0.14→0.06 | `vibrate(12)` at release | The existing `playClatter`, fired from [`DiceTray`](../../src/ui/dice/DiceTray.tsx) (`vibrate(12)`). #83 = tune on real device. |
| **Settle (result lands)** | Neutral | **GAP** | one soft `tick`/`thock` as motion stops · 0.06s · 0.10 | `vibrate(8)` | Punctuates the end of the tumble; the "it stopped" beat. |
| **Crit — nat 20** | Positive (max) | **GAP** | settle + bright rung `C6` overtone · +0.25s · 0.14 | `vibrate([10,20,10])` | Layer *on top of* settle. The brightest, highest cue. Gold/win. |
| **Crit — nat 1** | Negative (max) | **GAP** | settle + dull low `A2` clunk · +0.2s · 0.12 | `vibrate([14,36,14])` | Layer on settle. Darkest dice cue. Ruby/dropped. |

> Crits are a **modifier on settle**, not a fourth standalone sound — keeps the dice family
> coherent (always: clatter → settle → optional crit color).

### Controls, prompts & system

| Event | Family | Status | Cue | Haptic | Notes |
|---|---|---|---|---|---|
| **Keypad / stepper tap** | Neutral | **GAP** (recipe exists, unwired) | triangle `A4` · 0.05s · 0.08 | `vibrate(10)` | Quietest cue. The `step` *recipe* exists in `sfx.ts` but has **no call site** — keypad/steppers only `haptic()` today. #90 must **wire** `playSfx("step")` into the tap handlers, or the documented neutral tap stays silent. |
| **Undo** | Neutral (reverse) | **GAP** | `step` tone played *descending* `A4→E4` · 0.12s · 0.09 | `vibrate(8)` | "Rewind" feel — a neutral tick that goes *back*. |
| **Toggle on** (sound, concentration) | Neutral | **GAP** | soft tick up `E5` · 0.06s · 0.08 | `vibrate(8)` | Light, affirmative. |
| **Toggle off** | Neutral | **GAP** | soft tick down `C5` · 0.06s · 0.07 | `vibrate(8)` | Mirror of on. (Sound-mute toggle OFF is silent by definition — haptic only.) |
| **Concentration prompt (CON save needed)** | Neutral (alert) | **GAP** | two-note attention ping `E5,E5` · 0.10s · 0.12 | `vibrate([10,40,10])` | A *nudge*, not an alarm. Distinct, recognizable, never startling. Fires after the damage cue, slightly delayed so they don't mask. |
| **Concentration broken** | Negative (soft) | **GAP** | short falling `G4→C4` damped · 0.18s · 0.12 | `vibrate([14,36,14])` | A small loss — softer than HP damage. |
| **Save-error (persistence failed)** | Negative (system) | **GAP** | low double `thud` `D3,D3` · 0.16s · 0.12 | `vibrate([14,36,14])` | Rare, important. Loss-coded so a failure to save *feels* wrong. Pair with a visible toast. |

**Deliberately silent** (haptic-only or nothing — restraint): opening/closing sheets, scrolling
roll history, character-name edits, max-HP edits, every drag. Adding sound here would cheapen the
earned cues.

---

## 4. Loudness, duration & layering rules

**Loudness ladder** (peak gain — importance encoded as volume; never exceed ceiling):
- Neutral taps: **0.07–0.09**
- Confirmations / prompts / transactional: **0.10–0.14**
- Major life events (heal, damage, rests, crit): **0.14–0.18**
- Death / hard floor: **0.20** (the loudest *intended* cue; nothing should normally exceed it)
- **Absolute guardrail: 0.22.** A hard cap no cue may cross; a cue that needs more than this is the wrong cue. (0.20 is the design max for normal cues; 0.22 is the enforced ceiling — see the §7 guard test.)

**Duration ladder** (ties to `DESIGN.md` motion durations):
- Micro (taps, ticks, settle): **50–100ms**
- Short (confirmations, transactional, prompts): **100–250ms**
- Medium (heal/rest/crit/coin cascade): **250–400ms**
- Long (death knell only): **400–700ms**

**Envelope:** soft attack (~10ms, never an instant click), exponential decay to near-silence.
This is already how `playVoice` works — keep it. No cue has a hard cutoff.

**Layering with haptics — sound and haptic are one event, two channels:**
- The haptic is the *transient* (the hit/impact); the sound is the *resonance* (what it sounds
  like). Fire them **together** at the gesture.
- **Match the contour:** a single thud → `vibrate(10)`; a "loss/finality" → a triple pulse
  `[14,36,14]`; a rest/restore → a softer triple `[12,30,12]`; a light confirm → `vibrate(8)`.
  These patterns already exist in the codebase ([`HpValueEditor`](../../src/ui/HpValueEditor.tsx),
  [`DeathSaves`](../../src/ui/DeathSaves.tsx), [`RestControls`](../../src/ui/RestControls.tsx),
  [`CoinRow`](../../src/ui/CoinRow.tsx)) — standardize them in a small shared `haptic` helper.
- **Never double-fire.** One event = one sound + one haptic. When two events fire close together
  (damage → concentration prompt), **delay** the second cue ~120–200ms so they don't mask each
  other or feel like one muddy noise.
- **Haptic carries when sound can't.** If muted (or no AudioContext), the haptic still fires —
  the app still talks back. (The mute toggle governs *sound*, not haptics.)

---

## 5. Mute & reduced-motion (two distinct switches)

These are **not** the same control and must behave differently.

**Mute** (`hoard-hp-muted`, the existing toggle):
- Kills **all sound**, instantly, at the next play (engine already checks `isSoundEnabled()`
  per-call — keep that).
- **Haptics still fire.** Mute is about not making noise in a quiet room, not about killing
  feedback. The tactile channel carries.
- Default: **sound ON** (the app should feel alive on first use), fully toggleable, persisted.

**`prefers-reduced-motion`** (system preference):
- Reduced-motion users often want *less sensory load*, not just less animation. Apply it to sound
  too, but conservatively — **don't go fully silent**, that would remove confirmation feedback.
- **Strip:** layered/ambient/non-essential cues — the bloodied-tier swell, crit overtone layers,
  long decorative tails, any cue that's "flavor." Long rest collapses to its single core tone.
- **Keep:** short, essential, *confirming* cues — damage, heal, death, save-error, the
  concentration prompt, keypad taps. The user still knows their action registered.
- Rule of thumb: reduced-motion = **simplest version of each essential cue, no extras**; mute =
  **no sound at all** (haptic only). They compose (reduced-motion *and* muted = haptic only,
  simplest patterns).

Both are checked at play time, like mute is today — a flipped system pref or toggle takes effect
on the next cue with no reload.

---

## 6. Synth vs recorded assets (offline / install-size NFR)

**Recommendation: stay synth-first.** The current Web Audio engine (oscillators + a tiny shared
noise buffer) is **zero bytes of assets, zero dependencies, fully offline** — it satisfies the
PRD's "small install size that stays small as modules are added" NFR (PRD §5.4, §7) *by
construction*. Adding a sound system should add **no** audio files.

| | Synth (Web Audio) | Recorded (CC0 samples) |
|---|---|---|
| Install size | **0 bytes** | KBs–MBs (must precache for offline → bloats SW cache) |
| Offline | Free | Must self-host + precache (#45 burden) |
| Tunability | Live (change a number) | Re-record / re-source |
| Licensing | N/A | **CC0 only** — no attribution-required, no NC, no risk |
| Realism ceiling | Lower for dense textures (real dice) | Higher |

**Where synth is plenty:** all bells, chimes, thuds, pings, taps, prompts, knells — i.e. nearly
everything in §3. These *want* to be clean tonal cues, which synth nails.

**The one place to revisit:** the **dice clatter** (#83). Real tumbling dice are a hard texture
to synthesize convincingly; the current noise-tick clatter is the open question. If real-device
audition (#83) finds synth insufficient, the *only* sanctioned asset path is:
- **CC0 only** (freesound.org CC0, etc.) — no attribution, no NonCommercial, license recorded.
- **Tight budget:** total added audio **≤ ~50KB** gzipped, mono, low sample rate (22.05kHz is
  fine for a clatter), short. Precache via the existing SW (#45).
- Treat as a **last resort for one texture**, not a general direction. Default remains synth.

---

## 7. AC seeds for the implementation issue (#90)

Copy these into [#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90) as the
Acceptance Criteria (markdown checkboxes, per repo convention).

### Engine & architecture
- [ ] `SFX_NAMES` / `RECIPES` extended to cover **every `GAP`/`RECONFIG` cue** in §3
      (temp gain, temp absorb, down-to-0, save success/failure pips, revive, bloodied-tier,
      coin add/spend/distill, dice settle, crit nat-20, crit nat-1, undo, toggle on/off,
      concentration prompt, concentration broken, save-error).
- [ ] **Wire the existing-but-silent `step` cue:** `playSfx("step")` has **no call site** today —
      add it to the keypad/stepper tap handlers (the neutral tap is currently haptic-only).
- [ ] **Short rest = spend a Hit Die is one event:** reconfigure the existing `shortRest` cue to a
      roll-and-recover feel; do **not** add a second cue for hit-die spend.
- [ ] **Down (drop to 0)** is a distinct cue from **final death** (currently only `death` exists).
- [ ] **Dice crits** are implemented as a layer on **settle**, not standalone cues
      (clatter → settle → optional nat-20/nat-1 color).
- [ ] A shared **`haptic(pattern)` helper** standardizes the existing inline
      `navigator.vibrate` calls; each cue fires its **matched haptic** alongside the sound.
- [ ] Coin/dice textures reuse **one** bandpass-noise tick generator (retuned per coin vs die),
      not duplicated noise code.
- [ ] Dice/roll sounds are fired via the **effects architecture (#87)**, not inline in `App.tsx`.

### Behavior & families
- [ ] Cues obey the **family contracts** (§2): rising = positive, falling = negative, flat/quiet
      = neutral, granular = transactional; key-centered on C major / A minor.
- [ ] **Loudness/duration ladders** (§4) respected; **no cue exceeds peak gain 0.22**; soft
      attacks, exponential decays (no clicks).
- [ ] Co-firing events are **staggered** (e.g. damage → concentration prompt delayed ~120–200ms)
      so cues don't mask each other.

### Accessibility & constraints
- [ ] Every cue respects **mute** (`isSoundEnabled()` per play); **haptics still fire when muted**.
- [ ] `prefers-reduced-motion` **simplifies** cues per §5 (strips layers/tails, keeps essential
      confirmations) — checked at play time, distinct from mute; the two compose.
- [ ] **No audio asset files added** — synth-only (offline / install-size NFR). Any exception
      (dice texture, #83) is **CC0-only**, license recorded, **≤ ~50KB** gz, precached via SW.
- [ ] No cue is **startling**: verified by real-device audition in a dim/quiet setting.
- [ ] Folds in / supersedes the **dice clatter (#83)** tuning outcome.

### Tests
- [ ] Unit tests assert each event triggers its named cue and that **mute** and
      **reduced-motion** gate/simplify plays (extend `sfx.test.ts` / `soundSettings.test.ts`).
- [ ] A guard test asserts **no cue's peak gain exceeds the 0.22 ceiling**.

---

## Appendix — current state snapshot (for #90 baseline)

Recipes in [`src/sound/sfx.ts`](../../src/sound/sfx.ts): `damage`, `heal`, `step`, `roll`
(noise clatter), `stabilize`, `death`, `shortRest`, `longRest` — **8 recipes**. But `step` has
**no call site** (keypad/steppers only `haptic()`), so only **7 are actually wired**: `damage`,
`heal`, `roll` (from [`DiceTray`](../../src/ui/dice/DiceTray.tsx)), and `stabilize`/`death`/
`shortRest`/`longRest` (from [`App.tsx`](../../src/App.tsx)). Mute via
[`soundSettings.ts`](../../src/sound/soundSettings.ts) (`hoard-hp-muted`, default ON, checked per
play). Haptics are inline `navigator.vibrate` calls scattered across UI components. **For #90:
1 cue to wire (`step`), 1 to reconfigure (`shortRest` → hit-die), and ~18 new events in §3.**
