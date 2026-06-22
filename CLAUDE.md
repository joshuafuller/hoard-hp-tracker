# CLAUDE.md — Hoard

Project guidance for AI assistants working in this repo.

## Design System
Always read [`DESIGN.md`](DESIGN.md) before making any visual or UI decision.
All font choices, colors, spacing, radii, motion, and aesthetic direction (**Molten Hoard**)
are defined there. Do not deviate without explicit user approval.
In QA/review, flag any code that doesn't match `DESIGN.md`.

## Product
See [`docs/PRD.md`](docs/PRD.md) for product vision, target users, and the Scope-Fit Test that
governs what belongs in the app. Hoard is a single player's offline, at-the-table utility belt
(HP, coins, dice-next) — single-character, no accounts, local-only.

## Roadmap & working order
Before starting a new thread of work, read [`docs/ROADMAP.md`](docs/ROADMAP.md). It groups the
backlog into epics, maps dependencies, and sets the phased order — **do rework-preventing work first**
(testing visibility, spikes before features, bugs before building on them). Pick the lowest unblocked
item in the current phase; don't jump into a spike-gated feature. It also defines the testing/quality
bar (e2e required, coverage gate, mutation on the domain).
