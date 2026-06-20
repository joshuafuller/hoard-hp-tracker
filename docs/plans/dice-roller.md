# Engineering Plan — 3D Dice Roller (#75)

**Status:** Draft for approval · **Owner:** Joshua Fuller · **2026-06-20**
**Implements spec:** #73 · **Experience:** [`dice-journeys.md`](../ux/dice-journeys.md) + [`dice-storyboard.md`](../ux/dice-storyboard.md) · **Engine proven:** [`docs/spikes/dice-roller/`](../spikes/dice-roller/)

> The plan to review **before** any TDD. Confirms architecture, data flow, files, build order, and the
> risky bits. Follows the PRD §5.2 module pattern (pure domain core → store slice → presentational UI
> → entry surface → unobtrusive launcher).

---

## 0. Resolved decision — ad-hoc heal = manual "Apply as heal" (option A, 2026-06-20)
A `1d8+3` healing spell and a `1d8+3` damage bonus are **byte-identical notation**, so heal-vs-damage **cannot
be auto-detected**. **Decided:** every roll result card offers a manual **"Apply as heal"** button that adds the
roll total to current HP (capped at max). The player taps it after a Cure-Wounds-style roll, ignores it after
damage. Hit Dice + death saves keep their context-aware auto-apply. → `DiceResult` carries an `onApplyHeal`
action wired to `hp.heal(total)`.

## 1. Architecture (layers, mirroring the existing modules)

| Layer | New code | Tested by |
|---|---|---|
| **Pure domain** | `src/domain/dice.ts` — `buildNotation(selection)`, `toRollRecord(groups, notation)`, types. Death-save & Hit-Die *rules already exist* and are reused unchanged. | Vitest unit + fast-check property (no randomness). |
| **Engine adapter** | `src/ui/dice/diceEngine.ts` — lazy-imports `@3d-dice/dice-box`, wraps `@3d-dice/dice-parser-interface` (`parseNotation` → `box.roll` → rerolls loop → `parseFinalResults`), returns a `RollRecord`. Behind an interface so the UI can take a mock. | e2e / manual (WebGL can't run in jsdom). |
| **Store slice** | `src/store/useDiceHistory.ts` + a Dexie migration adding a `rolls` table. | Vitest + `fake-indexeddb`. |
| **Presentational UI** | `src/ui/dice/` — `DiceToken.tsx` (chrome entry), `DiceTray.tsx` (overlay), `DiceControls.tsx` (chips + modifier + adv/dis toggle + notation field), `DiceResult.tsx`, `DiceHistory.tsx`. Dumb, prop-driven; engine **injected**. | RTL with a mock engine. |
| **Integration** | `App.tsx` — token in chrome, tray overlay, route death-save & Hit-Die rolls through the tray. | RTL (App tests) + Playwright layout guard. |

**Key seam (low risk):** `useHp` already exposes `rollDeathSave(roll?)` and `shortRest(roll?)` that
accept an **injected** roll. Routing = the tray rolls the physical die, reads the face, then calls the
existing path. **No death-save / Hit-Dice domain changes.**

## 2. Data flow
```
chips → buildNotation() → "2d20kh1+5"
      → diceEngine.roll(notation)               // lazy dice-box physics + parser
      → parseFinalResults() groups
      → toRollRecord(groups, notation)          // pure → {notation,total,result,dice[]}
      → DiceResult (display)  +  useDiceHistory.record(rec)   // Dexie
```
- **Death-save mode:** on roll-complete, take the d20 face → `hp.rollDeathSave(face)`.
- **Hit-Die mode:** on roll-complete, take the die face → confirm → `hp.shortRest(face)` (heals `roll+CON`).
- **Ad-hoc / damage:** display + record only; **never touches HP**.

## 3. Assets & offline (#45)
- `npm i @3d-dice/dice-box @3d-dice/dice-parser-interface` (parser bundled by Vite — no runtime CDN).
- Vendor dice-box `dist/assets` (themes + `ammo.wasm`) + `world.*.js` → `public/dice/`; point dice-box's
  `assetPath` at `` `${import.meta.env.BASE_URL}dice/` `` so it works under `/hoard-hp-tracker/` **and** `/beta/`.
- Workbox (`vite.config` PWA): add `dice/**` to precache (globPatterns / additionalManifestEntries) so
  first open works offline. Verify **zero third-party requests at runtime**.

## 4. Build order — each step is its own red → green → refactor, committed separately
0. **Pre-flight (de-risk the two unknowns first, ~throwaway):** (a) confirm `@3d-dice/dice-parser-interface`
   imports + runs in **node** — if yes, the rerolls/explode/penetrate **reconcile loop gets real unit tests**,
   not fixtures; (b) confirm the **reduced-motion value source** — when we skip the physics throw we still need
   real face values, so identify dice-box's seedable/headless roller (or use the parser's own roller); "skip the
   tumble" is not enough. Findings adjust steps 1/3/7 before we commit to them.
1. **Domain** `dice.ts` (`buildNotation`, `toRollRecord`) — pure, unit + property tests. *(US-D1, D2, D3)*
2. **Store** `useDiceHistory` + migration — record / list newest-first / clear / session-persist. *(US-D4)*
3. **Engine adapter** `diceEngine.ts` — lazy loader + parser/rerolls reconcile → `RollRecord`. *(US-D7, US-D8 lazy)*
4. **UI** token + tray + controls + result + history (engine mocked in tests). **Smart defaults so the
   ≤3-interaction target survives advantage:** d20 pre-selected on open, last modifier remembered, adv/dis a
   single prominent toggle. *(US-D1, D2, D3, D4)*
5. **Wire into App** — chrome token opens tray; inert-when-closed; tap-clear / ✕ / Escape. *(A gates)*
6. **Route death-save + Hit-Die** through the tray + heal-apply — own commits, red-green, **layout guard stays green**. *(US-D5, US-D6)*
7. **Offline precache + reduced-motion instant-settle + a11y** (focus trap, names). *(US-D8, H gates)*
8. **Verify**: full local gate + real-browser `/browse` check + offline e2e → PR to `beta`.

## 5. Edge cases (write tests for these)
- Tray opened at 0 HP defaults to **death-save** mode; otherwise ad-hoc; Hit-Die mode entered from the panel.
- Negative / zero modifier; `count` clamped ≥ 1; d100 percentile via the parser.
- Dropped dice (advantage low die, `4d6kh3`, rerolls) shown struck; `result` excludes them.
- History **capped** (e.g. last 20) to bound IndexedDB growth; cleared on demand (long rest? — decide in step 2).
- Reduced-motion → instant settle but full result still shown.
- Engine **single instance**, initialised once on first open and reused; never imported in unit tests.

## 6. Risks & how we de-risk (resolve as we hit them, not upfront)
| Risk | Mitigation |
|---|---|
| dice-box **asset base path** on the Pages subpath (`/beta/`, `/hoard-hp-tracker/`) | Drive `assetPath` from `import.meta.env.BASE_URL`; verify on the deployed beta. |
| **Reduced-motion instant-settle** feasibility with a physics engine | Check dice-box options in step 3/7; fallback = skip the throw and render the parsed result directly. |
| **Bundle size** (Babylon is large) | Lazy dynamic-import only on first open; assert dice-box is **not** in the main chunk via build output. |
| WebGL **untestable in jsdom** | Inject a mock engine in component tests; rely on e2e for the real path. |
| Refactor of shipped **death-save / Hit-Dice** | Separate commits + red-green; the layout guard (which bit once before) is the safety net. |

## 7. Out of scope (follow-ups)
Radial-purse entry (#74) · custom gold/gem theme · saved roll presets (PRD §11) · feeding ad-hoc damage into HP.
