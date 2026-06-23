# Hoard docs — index

What each document is and whether it's **living** (kept current, build/review against it),
**reference** (stable background; read for context), or **archived** (a point-in-time artifact
— a completed spike or superseded draft; kept for history, not maintained).

Start with **[PRD](PRD.md)** (what/why/scope), then **[ROADMAP](ROADMAP.md)** (what to do next),
then **[DESIGN.md](../DESIGN.md)** (the Molten Hoard system) before any UI work.

## Product & process
| Doc | Purpose | Status |
|-----|---------|--------|
| [PRD.md](PRD.md) | Product vision, personas, and the §8 Scope-Fit Test that governs what gets built | **living** |
| [ROADMAP.md](ROADMAP.md) | Epics, dependency map, phased order, and the testing/quality bar | **living** |
| [RELEASING.md](RELEASING.md) | Versioning + release-please flow, the secret-free release ritual, commit-format hook | **living** |
| [DESIGN.md](../DESIGN.md) | The **Molten Hoard** design system (color, type, motion, the HP tier ladder) — at repo root | **living** |

## Design
| Doc | Purpose | Status |
|-----|---------|--------|
| [design/button-system.md](design/button-system.md) | The shared control/button primitives spec (#89) | **living** |
| [design/button-states.html](design/button-states.html) | Rendered visual spec of button states | **living** |
| [design/dice-tray.md](design/dice-tray.md) | Dice-tray design notes | **living** |
| [design/dice-tray.html](design/dice-tray.html) | Rendered dice-tray visual study | **living** |
| [design/foil-gold-study.html](design/foil-gold-study.html) | CSS prototype of the brushed/foil-gold shimmer (the recipe DESIGN.md cites, #51) | **living** |
| [design/sound-design.md](design/sound-design.md) | Sound palette + event→sound map (guides #90) | **living** |

## UX & research
| Doc | Purpose | Status |
|-----|---------|--------|
| [ux/single-character-hp-tracker.md](ux/single-character-hp-tracker.md) | Original HP-tool UX discovery; the PRD supersedes its scope framing | **reference** |
| [ux/dice-journeys.md](ux/dice-journeys.md) | Dice user journeys (reads with PRD §5.3) | **reference** |
| [ux/dice-storyboard.md](ux/dice-storyboard.md) | Dice interaction storyboard | **reference** |

## Plans
One home for plans: **`docs/plans/`** (the former `docs/superpowers/plans` was removed in #192).
| Doc | Purpose | Status |
|-----|---------|--------|
| [plans/dice-roller.md](plans/dice-roller.md) | The dice-roller build plan (the tray has since shipped) | **reference** |

## Spikes
Time-boxed investigations; each ends in a report. **Archived** = the question is answered and the
feature it informed has shipped; **living** = still guiding unbuilt work.
| Spike | Informs | Status |
|-------|---------|--------|
| [spikes/dice-roller/](spikes/dice-roller/) | The dice-engine proof-of-concept that PRD §5.3 + [dice-journeys](ux/dice-journeys.md) cite — kept for that evidence | **reference** |
| [spikes/dice-explosion-reconcile/report.md](spikes/dice-explosion-reconcile/report.md) | Exploding/reroll reconcile (#97/#108) — shipped | **archived** |
| [spikes/offline-audit/report.md](spikes/offline-audit/report.md) | Offline/PWA audit — shipped (installable PWA) | **archived** |
| [spikes/responsive-layout/report.md](spikes/responsive-layout/report.md) | Responsive strategy — guides the unbuilt #88 (spike #84) | **living** |
| [spikes/dice-burn/report.md](spikes/dice-burn/report.md) | Burning-dice feasibility — guides the unbuilt #91 (spike #86) | **living** |

## Assets
| Path | Purpose |
|------|---------|
| [gallery/walkthrough.gif](gallery/walkthrough.gif) | README hero walkthrough (regenerate via `scripts/record-walkthrough.mjs`) |

_(Screenshots under `docs/screenshots/` are generated on demand by `scripts/capture-screenshots.mjs`; they're not committed — see the README's "Regenerate the walkthrough" note.)_
