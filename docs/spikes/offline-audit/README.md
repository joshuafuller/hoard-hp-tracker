# Offline audit — Hoard HP Tracker (#45)

**Date:** 2026-06-22 · **Verdict:** ✅ The app makes **zero third-party requests at
runtime** and works fully offline after first load.

Hoard is an offline-first PWA (PRD §5.4) for use at the table, often on a phone with
no/poor signal. This audit confirms nothing on the happy path reaches the network.

## What was checked

### 1. No external requests in source
- `grep` of `src/` + `index.html` for `http(s)://`, `fetch(`, `XMLHttpRequest`,
  external `<script>`/`<link>`, and CDN hosts (googleapis, gstatic, unpkg, jsdelivr):
  **none found** on any runtime path.
- `index.html` references only local assets: `/favicon.ico`, `/icons/apple-touch-icon.png`,
  `/src/main.tsx`. No `preconnect`/`dns-prefetch`/analytics tags.

### 2. Fonts are self-hosted
- DM Sans + Fraunces load via `@font-face` from `./fonts/*.woff2` (`styles.css:11–25`) —
  no Google Fonts / network font fetch. (Required by #45; verified.)

### 3. The 3D dice engine is vendored same-origin
- `@3d-dice/dice-box` (BabylonJS + Ammo) + assets are vendored into `public/dice/`
  (`scripts/vendor-dice.mjs`) and imported same-origin at runtime — no CDN.

### 4. Everything is precached by the service worker
- `vite-plugin-pwa` (Workbox) precaches `**/*.{js,css,html,svg,png,jpg,ico,webp,woff2,json,wasm}`
  with a 4 MB file ceiling (covers the ~1.4 MB dice world bundle) — `vite.config.ts`.
- A production build precaches the full app (27 entries in `dist/sw.js`): JS/CSS, fonts,
  icons, and the dice engine + assets.

### 5. The only external URLs in the bundle are inert error strings
- `dist/assets/*` contains `react.dev/errors/`, `bit.ly/…`, `tinyurl.com/…` — these are
  **error-message text** inside React/dependencies (shown in the console if a specific
  error fires); they are **never fetched**. Not a runtime network dependency.

## Repeatable "test offline" procedure

```bash
pnpm build
pnpm preview --port 4173      # serves dist/ (the real PWA + service worker)
```

Then either:
- **DevTools:** open `http://localhost:4173`, let it load once (SW installs), DevTools →
  Network → **Offline**, reload. App boots; or DevTools → Application → Service Workers →
  check "Offline".
- **Device:** install the PWA, then enable **airplane mode** and relaunch.

Verify each core surface works with the network off:
- [ ] App shell loads (orb + HP numeral render)
- [ ] Apply damage / heal via the keypad (persists to IndexedDB)
- [ ] Coins sheet: add/spend/distill
- [ ] Dice tray opens and the 3D engine rolls (vendored assets load from cache)
- [ ] Reload while offline still boots (precache + SW serve the shell)
- [ ] Network tab shows **no failed third-party requests**

## Conclusion
No code change required — the app already satisfies the offline NFR. This report is the
documented, repeatable verification asked for in #45.
