# Dice — Storyboard (6-frame)

**Status:** Discovery artifact · pairs with [`dice-journeys.md`](./dice-journeys.md) · feeds #73 / #75
**Owner:** Joshua Fuller · **Last updated:** 2026-06-20
**Format:** 6-frame narrative arc (problem → solution → after). Not a UI mockup — an empathy/vision
tool to confirm the dice experience is *outstanding* before we spec and build it.

**Main character:** **Marcus**, the Mid-Combat Player (PRD §3 primary persona).
**Story told:** the **hero path** — an advantage attack mid-combat (journeys Journey A).

---

## Frame 1 — Meet Marcus *(the main character)*
Marcus, 34, is squeezed into a friend's kitchen-table game night. Phone in one hand, a fistful of
dice in the other, his D&D Beyond sheet open on a screen he barely has room for. The basement Wi-Fi
drops every few minutes. Combat's running hot and his initiative is two creatures away.

> *Mood:* engaged, a little keyed-up. *Setting:* warm, noisy, cramped, intermittent signal.

## Frame 2 — The problem emerges
The DM turns to him: *"Roll your attack — you've got advantage."* Now Marcus has to roll **two**
d20s, **remember to keep the higher one**, **add his +5**, and announce the result — fast. His
options are all friction: physical dice that scatter, mental math under pressure, or thumbing open a
*separate* dice app that has nothing to do with the HP he's already tracking in Hoard.

> *Mood:* the small dread of admin landing mid-fun. *The job:* `2d20 keep highest +5`, in seconds.

## Frame 3 — The "oh crap" moment
It's his turn **now**. The dice app is still spinning on bad Wi-Fi / a d20 rolled off the table /
he's lost track of whether he kept the high die or the low one. The table goes quiet, waiting. The
DM's eyebrow lifts. The 15-second turn window is gone and so is his flow — the worst possible moment
for the tool to be in the way.

> *Mood:* exposed, rushed, flow broken. *Stakes:* the table's attention and the turn's momentum.

## Frame 4 — The solution appears
A small **gold d20 token** catches the light in Hoard's top chrome — the app *already in his hand*,
the one showing his HP. He taps it. The screen dims and the **whole display becomes a transparent
dice tray** floating over his glowing health orb. No app-switch, no load spinner, no second device.

> *Mood:* relief + curiosity. *Key beat:* the tool he's already holding *is* the dice.

## Frame 5 — The "aha" moment
Tap **d20** → tap **Advantage** → set **+5** → flick. Two gold dice tumble across the dimmed card;
the **kept die glows**, the low die is **struck out**, and the answer reads **`2d20kh1+5 → 18 ▸ +5 =
23`**. Marcus calls *"23!"* before the DM finishes the sentence. **Zero typing. Under three seconds.
He never knew he rolled `2d20kh1` — he just tapped "Advantage."**

> *Mood:* delight, control, a flash of *that was satisfying*. *Payoff:* fast **and** physical **and**
> rules-correct, all at once.

## Frame 6 — Life after the solution
From then on Marcus rolls **everything** in Hoard. His attack, his `2d6+3` damage, the **death save**
when he drops to 0 (it ticks the pip for him), the **Hit Die** on his short rest (it offers the
healing straight into his orb) — all in the *same* gorgeous tray, **fully offline** in that
signal-dead basement. One tool, one screen, in his hand. He stays *in the game* instead of fighting
his tools — which is the whole point of Hoard.

> *Mood:* settled, immersed. *After-state:* dice stop being a context-switch and become part of the
> belt — the friction at **input** and **recovery** (the journey map's two hot spots) is gone.

---

## What this storyboard commits us to (carry into spec #73)
The frames are only "true" if the build delivers each beat — these are the felt requirements:

| Frame | Felt requirement | Spec hook |
|------:|------------------|-----------|
| 4 | The roller is *one tap from HP*, no app-switch, instant. | d20 token in chrome; lazy tray opens fast. |
| 4 | Tray floats over the dimmed card; never a separate screen. | full-screen "table throw" overlay. |
| 5 | **Advantage is one tap** — never type `2d20kh1`. | zero-typing core path (US-D2). |
| 5 | Result shows **total + per-die + notation**, dropped die struck. | record model + display (US-D1). |
| 5 | It *feels* physical but lands in **< 3s** / ≤ 3 interactions. | physics throw + tap-count target. |
| 6 | Damage rolls read-aloud; **death save + Hit Die flow into HP**. | dice↔HP ratified (journeys §5). |
| 6 | Works with **no signal**. | offline precache (#45, US-D8). |

If any frame's beat can't be met, the experience isn't outstanding yet — fix the build, not the story.
