# Spike report — burning/dissolve dice effect (#86)

**Question:** When dice are cleared / re-rolled, can the old dice **burn away** — an
organic flamefront creeping across each die (burning-paper), then gone — built on
`@3d-dice/dice-box` (BabylonJS), and what's the most plausible + performant technique?

**Method:** read the vendored engine in `node_modules/@3d-dice/dice-box@1.1.4`
(`dist/dice-box.es.js`, `dist/world.onscreen.js`, `dist/Dice.js` — the non-minified
twins of what `scripts/vendor-dice.mjs` ships to `public/dice/`) and Hoard's adapter
(`src/ui/dice/diceEngine.ts`) to map the per-die mesh/material/lifecycle surface. No
runtime proof was needed to reach a verdict on the technique; the one genuine unknown
(the **access seam**) is analysed below and is what a proof should target if we build one.

---

## TL;DR / Recommendation

- **Technique: a dissolve shader** — a noise-threshold alpha cut with an **emissive
  flamefront edge band** (gold→white-hot ember at the dissolving boundary), animated by a
  rising `burn` progress value. This is the most plausible "burning paper" look and the
  most performant on a phone (one extra fragment-shader branch on meshes that already
  exist; no new draw calls, no particle overdraw). It also **fits dice-box's existing
  material**, which is already a Babylon `CustomMaterial` with GLSL injection hooks.
- **Per-die independence** must come from a **per-instance `burn` attribute** registered
  exactly like dice-box's own `customColor` instanced buffer — *not* a material uniform
  (a uniform would dissolve every die at once, because all dice share one material).
- **The hard part is not the shader — it's the access seam.** dice-box exposes **no**
  public way to reach the dice meshes or the Babylon scene, and **no before-clear hook**.
  The only reliable seam is the **vendored-bundle patch layer** we already own
  (`scripts/vendor-dice.mjs`, precedent: the #81 antialias patch) — to expose the scene /
  die meshes and a pre-clear callback. **Verdict: feasible, but seam-gated** — see Risks.
- **A proof is feasible and worth it**, but it should de-risk *the seam* (can app code get a
  handle to a die mesh and animate it before disposal?), not the shader. ~Half a day.

---

## 1. What dice-box / BabylonJS actually exposes

### 1a. Renderer topology (good news)
Hoard runs dice-box with **`offscreen: false`** (`diceEngine.ts` line 128). That choice —
made for the #81 antialias/DPR patch — also matters here: the **BabylonJS scene and all
dice meshes live on the main thread** (`world.onscreen.min.js`). Only the **Ammo physics**
runs in the worker (`world.*` <-> `physicsWorkerPort`, exchanging a flat `Float32Array`
position/quaternion buffer). So an effect can touch meshes directly **without going near
the worker** — burning is a pure render-side concern and cannot "break the worker" as long
as it doesn't dispose meshes the physics buffer still references (see section 4).

> If we ever flip to `offscreen: true`, the scene moves into a worker and this entire
> approach changes (meshes unreachable from app code). The burn effect therefore has a
> hard dependency on staying on the on-screen renderer.

### 1b. Per-die object model (the constraint that drives the technique)
Each die is a dice-box `Die` instance (`Dice.js`, class exported as `D`/`Oe`) held in the
world's private die cache (`world.onscreen` WeakMap field, keyed by id). Each one has:

- `.mesh` — a Babylon **`InstancedMesh`** (`createInstance(...)`, `Dice.js:33179`). All
  dice of one type+theme are **instances of a single source mesh** sharing **one material**.
- `.config`, `.value`, `.asleep`.

The default theme's material (`world.onscreen` `loadColorMaterial`) is a Babylon
**`CustomMaterial`** built with light/dark variants, and **per-die colour is already done
with a per-instance buffer**:

```js
// Dice.js:33180-33182  — per-die colour via instanced buffer
s.instancedBuffers.customColor = te.FromHexString(this.config.themeColor);
// Dice.js:33196 — registered on the shared mesh
h.registerInstancedBuffer("customColor", 3)
// world.onscreen loadColorMaterial — the shader already reads it:
.Vertex_Definitions("attribute vec3 customColor; varying vec3 vColor;")
.Vertex_MainEnd("vColor = customColor;")
.Fragment_Custom_Diffuse("baseColor.rgb = mix(vColor.rgb, baseColor.rgb, baseColor.a);")
.AddAttribute("customColor")
```

**Two things follow directly:**
1. The dice already render through a `CustomMaterial` with the exact GLSL injection points a
   dissolve shader needs (`Fragment_Custom_Alpha`, `Fragment_Custom_Diffuse`,
   `Fragment_Before_FragColor`, `Vertex_*`, plus `AddUniform`/`AddAttribute`). We are not
   fighting the material model — we are extending a pattern it already uses.
2. Because the material is **shared across all dice**, a dissolve **uniform** would burn
   every die in lockstep. To burn dice independently (and they must, for the "creeping
   flamefront" to read), the dissolve progress must be a **per-instance attribute**
   (`registerInstancedBuffer("burn", 1)`), set per die and animated per die.

### 1c. Public API surface (the bad news)
The `DiceBox` instance Hoard holds (`box` in `createDiceTray`) exposes only:

| Public | What it gives you |
|---|---|
| `init / roll / add / reroll / remove / clear / hide / show / updateConfig / getRollResults` | control verbs + final values |
| `onBeforeRoll / onDieComplete / onRollComplete / onRemoveComplete / onThemeConfigLoaded / onThemeLoaded` | callbacks — **all value/metadata only** |
| `canvas`, `config` | the DOM canvas + config |

Crucially:
- **No accessor returns the scene, the world, or any mesh.** The world (`u`), scene (`K`),
  and die cache (`Z`) are **private `#`-style WeakMap fields** — unreachable from app code.
- **`onDieComplete(die)` hands you `{rollId, value, sides, ...config}` — never the mesh.**
- dice-box **does not re-export or globalise Babylon.** It bundles its own copy; there is
  no `window.BABYLON` and `EngineStore.LastCreatedScene` lives only inside the bundle's
  private module scope. So "grab the scene via Babylon's global" **does not work here.**
- **There is no `onBeforeClear` / `onClear` hook.** `clear()` disposes meshes synchronously
  with no notification (`world.onscreen` `clear()`: `Object.values(Z).forEach(e => e.mesh.dispose())`).

**Conclusion:** there is **no public seam** to run a per-mesh effect at clear time. This is
the central feasibility finding, and it dictates everything below.

---

## 2. Technique options (and why dissolve wins)

| Option | Look | Per-die? | Perf on phone | Fit with dice-box | Verdict |
|---|---|---|---|---|---|
| **Dissolve shader** (noise alpha cut + emissive edge) | True "burning paper" — organic crawling front, glowing ember rim, char | Yes, via per-instance `burn` attr | **Best** — 1 texture fetch + a few ALU per fragment on meshes that already render; no extra draw calls | **Best** — material is already a `CustomMaterial` with the needed hooks | **Recommended** |
| Texture burn-map (scroll a burn mask in UV) | Decent, but burns in UV space -> seams at face edges, looks "printed", not volumetric | Per-instance (needs attr too) | Good | Same hooks | Inferior look for similar cost — fold the mask *into* the dissolve as the noise source instead |
| GPU particles (embers/smoke) | Great as a **garnish**, terrible as the primary — particles don't "consume" the die, and a burst per die = overdraw | N/A (additive) | **Worst** — fill-rate heavy; mid-phone risk | Independent of dice-box meshes (own emitter) | **Secondary only** — a few sparks rising off the flamefront, gated/optional |
| DOM/canvas overlay (2D burn over the canvas) | Flat, screen-space; can't follow a tumbling 3D die; reads as a fade/wipe | No (per-die impossible) | Cheap | No engine access needed | **Rejected** — fails the "plausible, not a fade" AC |

**Recommended:** dissolve shader as the body of the effect; **optionally** a handful of
ember particles riding the flamefront as garnish (#91 "could", gate separately). The
dissolve's noise should be a **3D/triplanar or object-space noise** (not UV) so the front
crawls across faces continuously without UV seams — this is what sells "organic".

### Shader sketch (extends the existing `CustomMaterial`)
```
// per-instance attribute, like customColor:
AddAttribute("burn");                 // 0 = whole, 1 = gone
Vertex_*: varying float vBurn; vBurn = burn;
// fragment:
float n = noise(vObjectPos * FREQ);   // object-space -> crawls across faces, no seams
float edge = 0.06;                     // width of the glowing front
if (n < vBurn - edge) discard;         // fully burned -> hole
// flamefront band: emissive gold->white-hot at the boundary
float t = smoothstep(vBurn - edge, vBurn, n);
color.rgb = mix(EMBER_WHITE, GOLD, t) ... ; // add to Fragment_Before_FragColor
// optional: darken/char just behind the front before discard
```
Drive `burn` 0->1 over the effect duration per die. Colours come straight from
`DESIGN.md` (gold `#E8B45A`, white-hot highlight, warm-black char) — this is exactly the
"Molten Hoard / molten gold" material thesis, so the effect is on-brand, not bolted on.

---

## 3. Performance (mid-range phone)

- **Fragment cost:** one noise sample (procedural or a small tiled texture) + a few ALU and
  a `discard` per fragment, only on the dice (a handful of small meshes). Negligible vs. the
  PBR-ish lighting already running. No new draw calls; instancing is preserved.
- **`discard` caveat:** alpha-test/`discard` disables early-Z on tile GPUs (most phones).
  With only a few dozen small dice covering little screen area, this is fine. Keep the burn
  **short (~600-900 ms)** so any cost is transient.
- **The render loop is normally stopped.** `renderLoop()` calls `stopRenderLoop()` once all
  dice settle, and `clear()` also stops it (`world.onscreen` lines 13014, 13036). **The
  burn must therefore drive its own render loop** (`engine.runRenderLoop` / rAF) for its
  duration and **hand control back / stop** when done, so we don't leave the GPU spinning
  at idle (battery). This is a small but mandatory piece of the effect's lifecycle.
- **Particles (if used):** strictly capped (e.g. <= a few dozen total, not per die),
  short-lived, additive; first thing to drop on a perf budget.
- **Reduced motion:** see section 5 — the burn is simply **never started**; dice clear instantly.

---

## 4. Trigger & timing — without breaking the engine/worker

There are **two** triggers, and they need **different seams**:

### (a) Clear button -> `box.clear()`
Hoard's `DiceTray.clear()` is just `() => box.clear()`. To burn here we must run the effect
*before* `clear()` disposes the meshes. Options, best first:
1. **Vendored pre-clear hook** — patch `world.onscreen` (and/or `dice-box.es`) in
   `vendor-dice.mjs` to fire an `onBeforeClear(dice)` callback (handing over the live die
   meshes/scene) *before* the dispose loop. Precedent exists: `vendor-dice.mjs` already
   patches `world.onscreen` for #81, and **fails the build loudly** if the patch target
   moves — reuse that guard pattern.
2. Or have the **adapter** run the effect, then call `box.clear()` after — but the adapter
   can't reach the meshes without (1) anyway, so (1) is the foundation either way.

### (b) Re-roll -> `box.roll(notation)` <- the common case, and the trap
`DiceBox.roll()` **calls `this.clear()` synchronously as its first line**
(`dice-box.es` line 269). So by the time a new roll starts, the old dice are **already
disposed** — there is no post-hoc handle. Burning on re-roll therefore requires
**snapshotting/detaching the old dice meshes _before_ the internal clear runs**:
- cleanest: the same **`onBeforeClear`** hook from (a) fires inside `clear()`, which `roll()`
  calls — so one patch covers both triggers. The hook hands the meshes to the effect, which
  **re-parents/keeps them alive** (don't let the dispose loop kill them; or clone them) and
  animates the burn while the *new* dice roll in. The detached burning meshes are purely
  visual — they hold no physics body (physics only knows ids in the buffer), so animating or
  disposing them **cannot desync or break the worker**.

### Worker safety
The physics worker exchanges a flat position buffer keyed by die id; it never touches
materials and is told nothing about the burn. As long as burning meshes are **detached
copies** (or disposed only after the buffer no longer lists them), the worker is unaffected.
This satisfies "trigger on clear/re-roll without breaking the engine/worker."

### Timing
- Burn duration ~**600-900 ms**, slight per-die stagger (the world already staggers dice by
  `config.delay`; mirror that so the front feels organic, not synchronised).
- On re-roll, the burn of the old set overlaps the throw of the new set — reads as the old
  dice "burning away as the new ones land". Acceptable; tune stagger so it isn't busy.

---

## 5. Reduced-motion fallback

`prefers-reduced-motion` -> **instant clear, no burn**. This is trivial and already
half-built: Hoard *already* has a no-WebGL/reduced-motion path (`rollHeadless`, no engine)
in `diceEngine.ts`, and `DESIGN.md` (Motion section) mandates honouring `prefers-reduced-motion`
("keep instant state"). Implementation: the effect's entry point checks the media query and
the perf/feature gate; if reduced-motion (or the effect is disabled), skip straight to
`box.clear()` — exactly today's behaviour. No special code path in the engine.

---

## 6. Risks & open questions

1. **Access seam = the whole risk.** There is no public API to reach dice meshes or the
   scene, and no before-clear hook. The viable path is **patching the vendored bundle**
   (`vendor-dice.mjs`) to expose the scene/meshes and add `onBeforeClear`. Risk: the patch
   targets minified internals and can break on a dice-box upgrade — **mitigate with the
   existing loud-fail guard** (#81 pattern). A heavier alternative is forking dice-box.
2. **Tension with #91's "no changes to the dice core."** The only reliable seam *is* a
   change to the vendored engine. Reconcile in #87: treat the **vendor-patch layer** as part
   of Hoard's adapter/effects layer (it already carries the #81 patch), not as "dice core"
   gameplay logic. **#87's effects architecture should own a scene/mesh accessor + a
   `onBeforeClear` event** so #91 plugs in without touching `diceEngine.ts` rolling logic.
   Flag this as a real dependency on #87, not a footnote.
3. **Per-instance attribute plumbing.** `burn` must be registered on the shared source mesh
   (`registerInstancedBuffer("burn", 1)`) and the `CustomMaterial` extended with the
   attribute — done at theme-load time, which is also inside the vendored layer.
4. **`discard`/early-Z on tile GPUs** — fine at dice scale, but verify on a real mid-range
   phone; keep the burn short and the dice count realistic.
5. **Self-driven render loop lifecycle** — must start on burn, stop when done; a leaked loop
   = battery drain. Easy to get wrong; cover with the proof.
6. **Theme coupling** — analysis is for the **default theme** (the one Hoard ships). The
   material hooks and `customColor` precedent are default-theme specifics; another theme
   could differ. Hoard only uses default, so acceptable, but note it.

---

## 7. Is a proof feasible? Yes — and it should target the seam, not the shader

A dissolve shader on a Babylon mesh is well-trodden; it doesn't need de-risking. The single
unknown is: **can app/effect code obtain a live die mesh (and a render loop) at/just-before
clear, via a vendor patch, and animate it without disturbing physics?** A focused throwaway
proof (kept under `docs/spikes/dice-burn/`, like the dice-roller spike) should:
- patch a local dice-box copy to expose the scene + `onBeforeClear(dice)`,
- on clear/re-roll, detach the old meshes, swap to a `CustomMaterial` with a per-instance
  `burn` attribute, run a self-driven render loop, ramp `burn` 0->1, dispose at the end,
- confirm the physics worker keeps working (new rolls land normally) throughout.

That proves the only thing in doubt. Estimated ~half a day. (Not built in this spike — the
report's verdict does not depend on it; it would harden the seam before #91 starts.)

---

## 8. AC seeds for #91 (the feature)

- [ ] On **clear** and on **re-roll**, the previous dice **dissolve via a burning
      flamefront** (per-die organic crawling edge with an emissive gold->white-hot rim),
      then disappear — **not** an instant clear and **not** a flat fade.
- [ ] The flamefront is **per-die independent** (driven by a per-instance `burn` attribute,
      mirroring dice-box's `customColor`), with a slight per-die stagger so it reads organic.
- [ ] The effect uses an **object-space/triplanar noise** dissolve (no UV seams across die
      faces) and colours from `DESIGN.md` (gold `#E8B45A`, white-hot edge, warm char).
- [ ] **`prefers-reduced-motion` -> instant clear, no burn**; honoured via the effect's entry
      gate (reuses today's instant-clear behaviour).
- [ ] Burn completes in **~600-900 ms** and the effect **starts and stops its own render
      loop** (no idle GPU loop left running afterward).
- [ ] Implemented as a **registered effect via #87**, which must expose a **scene/mesh
      accessor and an `onBeforeClear(dice)` hook** (added in the vendored-bundle patch layer,
      guarded by the #81 loud-fail pattern) — **no changes to `diceEngine.ts` rolling logic**.
- [ ] Old burning meshes are **detached copies** (or disposed only after the physics buffer
      drops them) so rolling/physics is **never** disrupted (new rolls land normally during a
      burn).
- [ ] The effect is **gated/disable-able** (perf budget, feature flag) and ships as its **own
      PR**; disabling it falls back to instant clear with rolling unaffected.
- [ ] Optional garnish: a small, hard-capped ember/particle burst on the flamefront — gated
      separately, first to drop under the perf budget.
- [ ] Verified on a **real mid-range phone**: no jank during burn, no battery-draining idle
      loop, no `discard`/early-Z perf cliff at realistic dice counts.

---

## Evidence index (vendored engine, v1.1.4)
- `dice-box.es.js:256-308` — public verbs (`clear/roll/add/reroll/remove`); **`roll()`
  calls `this.clear()` first** (269); only `on*` value callbacks, no mesh/scene accessor.
- `world.onscreen.js:12953-13046` — main-thread Babylon scene; die cache; **`clear()` stops
  the render loop + disposes meshes** (13035); `renderLoop()` stops on settle (13014).
- `Dice.js:33171-33196` — `Die` class: `.mesh = source.createInstance(...)`
  (**InstancedMesh**); per-die `customColor` instanced buffer; `registerInstancedBuffer`.
- `world.onscreen.js` `loadColorMaterial` (~12868) — dice render through a Babylon
  **`CustomMaterial`** with GLSL injection hooks (`Fragment_Custom_Alpha/Diffuse`,
  `Vertex_*`, `AddAttribute`/`AddUniform`).
- `src/ui/dice/diceEngine.ts:114-191` — adapter holds only `box`; `clear: () => box.clear()`;
  `offscreen: false` (128).
- `scripts/vendor-dice.mjs:36-49` — precedent for patching the vendored bundle with a
  loud-fail guard (#81 antialias/DPR).
