<div align="center">

# 🪙 Hoard

**A gorgeous, offline, single-player HP tracker for tabletop games.**
*A luminous liquid orb for hit points — plus coins, a 3D dice tray, death saves, and rests.*

[![Open the live app](https://img.shields.io/badge/▶_Open_the_live_app-d9b85c?style=for-the-badge&labelColor=14110a)](https://joshuafuller.github.io/hoard-hp-tracker/)

[![PWA](https://img.shields.io/badge/PWA-installable-d9b85c?labelColor=14110a)](https://joshuafuller.github.io/hoard-hp-tracker/)
[![Offline](https://img.shields.io/badge/works-offline-4fb477?labelColor=14110a)](#use-it)
[![React 19](https://img.shields.io/badge/React-19-5fb3d4?labelColor=14110a&logo=react)](#tech--quality)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?labelColor=14110a&logo=typescript&logoColor=white)](#tech--quality)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-a78bfa?labelColor=14110a)](LICENSE)

<br>

<img src="docs/gallery/walkthrough.gif" alt="A walkthrough of Hoard — opening the gold radial hub, draining the liquid HP orb on damage, healing back, and the coin hoard" width="300" />

</div>

Fast one-screen tools for the bookkeeping you do on your turn — **no account, no connection; your
data stays on your device.** Open the app, **Add to Home Screen**, and it works offline at the table.

## What you get

- **HP at a glance** — a liquid orb that drains gold → bloodied → critical; tap to open the keypad or
  drag the orb up/down to heal/damage, with one-tap undo.
- **Coins** — track the hoard across pp/gp/sp/cp with quick steppers and one-tap **auto-distill**.
- **Dice** — a 3D physics tray for ad-hoc rolls, death-save d20s, and Hit Dice; advantage, modifiers,
  exploding/keep-drop notation, and a roll log.
- **Death saves & rests** — success/failure pips + a d20; **short rest** spends Hit Dice, **long rest**
  restores to full.
- **Concentration** — a CON-save prompt when you take damage while concentrating.
- **One gold sigil** — the radial action hub fans out coins, dice, concentration, sound, and about, so
  the screen stays calm.
- **Feel** — a cohesive synth sound palette + haptics, both optional and mutable.
- **Offline-first PWA** — installable; works with no connection.

## Use it

- **Just play it** — [open the app](https://joshuafuller.github.io/hoard-hp-tracker/), then **Add to
  Home Screen** on your phone for a fullscreen, offline app.
- **Beta builds** — work-in-progress from the `beta` branch deploys to
  **[/beta/](https://joshuafuller.github.io/hoard-hp-tracker/beta/)** (production above is never affected).

It's free, open source, and ships **no game content** — an independent, unofficial fan tool.

---

## Build & self-host

For developers. Players don't need any of this — just the link above.

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

**Self-host with Docker**

```bash
docker build -t hoard-hp .
docker run -p 8080:8080 hoard-hp      # http://localhost:8080
# or: docker compose up --build
```

**Quality gates** (test-driven; every change ships with tests)

```bash
pnpm test           # Vitest
pnpm typecheck      # tsc --noEmit (strict)
pnpm lint           # eslint
pnpm build          # tsc + vite build (emits the PWA service worker)
pnpm mutation       # Stryker mutation testing over src/domain
```

## Tech & quality

React 19 + Vite + TypeScript (strict) + Vitest, `vite-plugin-pwa` (Workbox) for offline/install, and
Dexie (IndexedDB) for local persistence. The HP rules live in a small **pure, fully-tested domain
core** (`src/domain/`); the UI is presentational. The domain is held to a high bar — **example +
property-based tests** (fast-check) and **mutation testing** (Stryker), with CI failing the build
below a 90% mutation score.

## Product direction

Hoard is **a single player's utility belt at the tabletop** — fast, offline, one-screen tools for the
bookkeeping a player does on their turn. What belongs in the app (and what deliberately doesn't) is
governed by an explicit **Scope-Fit Test**. See the
**[Product Requirements Document](docs/PRD.md)** for the vision, personas, and how scope grows.

## License

[AGPL-3.0](LICENSE). See [`NOTICE`](NOTICE). This is an independent, unofficial fan tool and ships no
third-party game content.

---

<details>
<summary><b>Regenerate the walkthrough</b></summary>

The README walkthrough is recorded from the live app — no manual editing:

```bash
pnpm build
pnpm preview --port 4173 &                 # background the preview only
node scripts/record-walkthrough.mjs        # → docs/gallery/walkthrough.gif (needs ffmpeg)
```

`record-walkthrough.mjs` drives the production build in a 390×844 mobile viewport (fresh profile →
deterministic 10/10 seed, a sample character name) through a short tour — opening the radial hub,
draining the HP orb on damage, healing back, and the coin hoard — and ffmpeg-encodes it to an
optimized looping GIF. (`scripts/capture-screenshots.mjs` still grabs individual still PNGs under
`docs/screenshots/` if you need them.)
</details>
