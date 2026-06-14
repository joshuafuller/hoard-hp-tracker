# Hoard HP Tracker

**A gorgeous, fullscreen, mobile-first HP tracker for tabletop games — installable, offline, and
self-hostable.** Original open-source code; ships no game content.

Track current / max / temporary hit points with big thumb-reach **−/+** controls, plus death saves,
short/long rest with Hit Dice, a tap-to-edit pill, satisfying haptics, and optional sound. Runs as an
installable PWA (works offline at the table) or a one-command Docker container.

## Features

- **HP at a glance** — luminous readout, a tiered bar (green → amber → red) with a temp-HP overshield.
- **Death saves** — three success / three failure pips and a d20 roll; revive / stabilize / dead.
- **Rests** — spend Hit Dice on a short rest; full recovery on a long rest (with a CON modifier).
- **Tap to set** — tap any value for a pill editor: `−` · type · `+`.
- **Feel** — haptics on supported devices, optional sound effects (mutable).
- **Offline-first PWA** — installable; works with no connection. Your data stays on your device.

## Run it

**Dev**

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

**Quality gates** (test-driven; every change ships with tests)

```bash
pnpm test           # Vitest
pnpm typecheck      # tsc --noEmit (strict)
pnpm lint           # eslint
pnpm build          # tsc + vite build (emits the PWA service worker)
```

**Self-host with Docker**

```bash
docker build -t hoard-hp .
docker run -p 8080:8080 hoard-hp      # http://localhost:8080
# or: docker compose up --build
```

## Tech

React 19 + Vite + TypeScript (strict) + Vitest, `vite-plugin-pwa` (Workbox) for offline/install, and
Dexie (IndexedDB) for local persistence. The HP rules live in a small **pure, fully-tested domain
core** (`src/domain/`); the UI is presentational.

## License

[AGPL-3.0](LICENSE). See [`NOTICE`](NOTICE). This is an independent, unofficial fan tool and ships no
third-party game content.
