# Offline Audit — Hoard HP Tracker (#45)

**Verdict: PASS.** Hoard works fully offline. Static analysis of the whole repo
and of the production build (`HOARD_BASE=/hoard-hp-tracker/beta/ pnpm build`) found
**zero third-party runtime requests**. Every asset the app needs at runtime — app
shell, self-hosted fonts, the 3D dice engine + its web-worker + Ammo physics WASM +
dice themes — is served same-origin and precached by the service worker. No CDNs,
no analytics, no remote fonts, no remote dice assets.

Audited on: `docs/offline-audit-45` (off `beta`). Build: vite 6.4.3, Node 24.14.1,
pnpm 10.30.2, vite-plugin-pwa 0.21.2 (Workbox `generateSW`).

---

## How offline is achieved (architecture)

| Concern | Mechanism | Where |
|---|---|---|
| App shell (HTML/JS/CSS) | Vite build, base-path aware, Workbox precache | `vite.config.ts`, `index.html` |
| Fonts (DM Sans, Fraunces) | Self-hosted `.woff2` via `@font-face`, no remote fonts | `src/styles.css:11-25`, `src/fonts/` |
| 3D dice engine | `@3d-dice/dice-box` **vendored same-origin** into `public/dice/` | `scripts/vendor-dice.mjs` |
| Dice worker + physics | World workers (`world.*.min.js`) + `ammo.wasm.wasm` vendored & precached | `public/dice/` |
| Dice asset paths | Resolved from `import.meta.env.BASE_URL` (honours the Pages subpath) | `src/ui/dice/diceEngine.ts:22-24` |
| State (HP / coins / dice history) | IndexedDB via Dexie — local-only, no network | `src/store/db.ts`, `useHp.ts`, `useCoins.ts` |
| Sound | Web Audio API, fully **synthesized** (no audio files) | `src/sound/sfx.ts` |
| Service worker | `registerType: "autoUpdate"`, precaches everything matching the glob | `vite.config.ts:25-37` |

Key precache config (`vite.config.ts`):
- `globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,webp,woff2,json,wasm}"]` — covers
  the dice JS/worker, themes (json/png/jpg), the physics `wasm`, and the fonts (`woff2`).
- `maximumFileSizeToCacheInBytes: 4 * 1024 * 1024` — lifts Workbox's 2 MiB default so the
  ~1.4 MB BabylonJS bundle is never silently skipped from the offline cache.

---

## Static analysis findings

### 1. No external URLs in app source
`grep` of `src/`, `index.html`, and `*.css` (excluding the vendored, same-origin
`public/dice/` engine) for `https?://` returns **nothing**. No `fetch()` to remote
hosts, no `XMLHttpRequest`, no `axios`, no `sendBeacon`, no `googleapis`/`gstatic`/
`gtag`/`sentry`/`unpkg`/`jsdelivr`/`cdnjs`/`fonts.google`. The only `fetch`-adjacent
calls in app code are Dexie `db.hp.get(...)` (IndexedDB, local).

### 2. Fonts are self-hosted (already verified in #45, re-confirmed)
`src/styles.css` loads `./fonts/dm-sans.woff2` and `./fonts/fraunces.woff2` only.
After build these are fingerprinted to `dist/assets/dm-sans-*.woff2` /
`fraunces-*.woff2` and precached. `index.html` has **no** `preconnect`, `dns-prefetch`,
`prefetch`, or `preload` hints to any remote origin.

### 3. Built output (`dist/`) has zero runtime external dependencies
The only `http(s)://` strings anywhere in `dist/` are **inert text inside error /
warning / console messages** in third-party libs — never fetch targets, `<script src>`,
`<link>`, or imports:

| URL | Source | Nature |
|---|---|---|
| `bit.ly/2kdckMn` | Dexie | "transaction committed too early" error text |
| `bit.ly/wb-precache` | Workbox | precache console warning |
| `doc.babylonjs.com/...` | BabylonJS | importer error message |
| `fantasticdice.games/docs/...` | dice-box | config-deprecation error message |
| `react.dev/errors/` | React | minified error-decoder link |
| `tinyurl.com/y2uuvskb` | Dexie | "IndexedDB API missing" notice |

None of these execute a network request; they are only shown/logged on an error path.

### 4. Base-path correctness (the /beta/ subpath)
Built with `HOARD_BASE=/hoard-hp-tracker/beta/`, all asset references in
`dist/index.html` are correctly rewritten to `/hoard-hp-tracker/beta/...` (favicon,
apple-touch-icon, JS, CSS, manifest, `registerSW.js`). The dice loader uses
`import.meta.env.BASE_URL`, so the engine, worker, and assets resolve under the same
subpath. The PWA manifest uses **relative** `id`/`scope`/`start_url`/icon URLs, so it
is base-path independent.

### 5. Service-worker precache is complete
Build reports **29 precache entries (~3.86 MiB)**. Every runtime file in `dist/`
appears in the `dist/sw.js` precache manifest — a diff of `find dist -type f` against
the precached URL set found **0 missing files** (only `sw.js` and `workbox-*.js`
themselves are not self-precached, which is correct). The precache includes, notably:

- `assets/index-*.js`, `assets/index-*.css`, `index.html`, `manifest.webmanifest`,
  `registerSW.js`
- `assets/dm-sans-*.woff2`, `assets/fraunces-*.woff2` (fonts)
- `dice/dice-box.es.min.js` (engine), `dice/world.{none,onscreen,offscreen}.min.js`
  (workers), `dice/Dice.min.js`, `dice/style.css`
- `dice/assets/ammo/ammo.wasm.wasm` (physics)
- `dice/assets/themes/default/*.{json,png,jpg}` (dice meshes/textures/config)
- `favicon.ico`, `favicon.png`, `icons/*.png`

Dice payload precached: ~3.3 MB (the bulk of the cache); fonts ~132 KB combined.

---

## Repeatable "test offline" procedure

> Goal: prove the app loads and that HP, coins, and 3D dice all work with the
> network fully cut.

1. **Build (production, beta base path):**
   ```bash
   HOARD_BASE=/hoard-hp-tracker/beta/ pnpm build
   ```
   Confirm the build log ends with `precache <N> entries` and `dist/sw.js` is generated.
   (For a root-path test instead, run `pnpm build` and serve `dist/` at `/`.)

2. **Preview the built output:**
   ```bash
   pnpm preview --host
   ```
   Open the printed URL (note: `vite preview` serves at `/`, so the JS/CSS/SW will 404
   if you built with the `/hoard-hp-tracker/beta/` base — for a quick local check,
   prefer a plain `pnpm build` + `pnpm preview`; use the beta base only to inspect
   `dist/` artifacts, or serve `dist/` under the real `/hoard-hp-tracker/beta/` path,
   e.g. with `python3 -m http.server` from a parent dir).

3. **Warm the cache & register the SW:**
   - Open the app in Chrome. DevTools -> **Application -> Service Workers**: confirm the
     SW is **activated and running**.
   - DevTools -> **Application -> Cache Storage**: confirm a `workbox-precache-*` cache
     with ~29 entries (incl. `dice-box.es.min.js`, `ammo.wasm.wasm`, both `*.woff2`).
   - **Open the dice tray once** while online so the lazy-imported engine + WASM are
     fetched and cached (they are precached, so this is belt-and-suspenders).

4. **Go offline:**
   - DevTools -> **Network -> Throttling -> Offline** (or **Application -> Service
     Workers -> Offline** checkbox).

5. **Hard-reload and exercise every feature offline:**
   - **Reload** the page — it must load fully (fonts rendered, no FOUT-to-fallback,
     no network errors in Console).
   - **HP:** damage / heal / set temp HP / change max — orb updates, tier glow changes.
   - **Coins:** add / spend coins — totals persist.
   - **Dice:** open the tray, roll a die chip (e.g. `1d20`) and a notation (e.g. `3d6!`)
     — 3D dice physically tumble and a result + history entry appear.
   - **Persistence:** reload again (still offline) — HP/coins/dice-history survive
     (IndexedDB).
   - Throughout, the **Network panel should show only `(ServiceWorker)` / `(disk
     cache)` sources and zero failed requests**.

6. **Pass criteria:** app shell loads, fonts render from cache, 3D dice roll, HP & coins
   mutate and persist, and the Network panel shows **no outbound network requests** and
   **no failures** while offline.

---

## Gaps

**None blocking.** No defect would cause a feature to fail offline. Minor notes:

| # | Severity | Note |
|---|---|---|
| 1 | Info | The lazy dice engine is also covered by precache, so it works offline even on the *first* tray open (no need to pre-warm online). Verified the worker + WASM are in the precache manifest. |
| 2 | Low (process) | `public/dice/` is git-ignored and regenerated by `scripts/vendor-dice.mjs` on every `dev`/`build`. Offline integrity therefore depends on the build step running the vendor script (it does, via `package.json`). If that script is ever removed from the build, the engine would be missing — the script itself fails loudly on a dice-box upgrade (quality-patch guard), but there is no guard asserting the dice assets ended up in the precache. Consider a tiny post-build check that `dist/sw.js` contains `ammo.wasm.wasm` + `dice-box.es.min.js`. |
| 3 | Low (test) | There is no automated offline e2e test (`context.setOffline(true)`) exercising HP/coins/dice. The procedure above is manual. A Playwright offline smoke test would lock this in against regressions. |

These are hardening suggestions, not offline failures. The current build is fully
offline-capable.

---

## Reproduction commands (summary)

```bash
# Build for the beta subpath and inspect the precache:
HOARD_BASE=/hoard-hp-tracker/beta/ pnpm build

# Confirm every runtime file is precached (expect: 0 missing):
node -e 'const fs=require("fs"),cp=require("child_process");
  const sw=fs.readFileSync("dist/sw.js","utf8");
  const pc=new Set([...sw.matchAll(/"([^"]+\.(?:js|css|html|woff2|wasm|png|jpg|json|ico|webp|svg|webmanifest))"/g)].map(m=>m[1]));
  const files=cp.execSync("find dist -type f").toString().trim().split("\n").map(f=>f.replace(/^dist\//,""));
  for(const f of files){ if(/^(sw\.js|workbox-)/.test(f))continue;
    // Match either direction: precache URLs may carry a base-path prefix
    // (e.g. /hoard-hp-tracker/beta/assets/...), so check p ends with the
    // relative dist file f (and the exact-equal case for unprefixed URLs).
    if(![...pc].some(p=>p===f||p.endsWith(f)))console.log("MISSING:",f); }
  console.log("done — nothing above means all runtime files are precached");'

# Scan dist for any external URL (expect: only inert error-message strings):
grep -rhoE "https?://[a-zA-Z0-9./_-]+" dist | sort -u
```
