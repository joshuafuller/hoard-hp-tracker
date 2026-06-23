# Spike — Responsive layout strategy

> **Issue:** #84 (time-boxed design spike). **Feeds:** #88 (responsive-layout implementation).
> **Status:** docs-only — this PR adds this report and changes no source code.
> **Method note:** the §1 breakage inventory was **first derived from reading the CSS**
> (`src/styles.css`, `src/App.css`, `playwright.config.ts`, `src/pwa-manifest.ts`) and is
> now **verified against captured screenshots** (see §1.5, 2026-06-23). The `[verify]`
> tags in §1 mark the original CSS-hypotheses; §1.5 records what the screenshots actually
> show — including where reality differed (e.g. **≤320 came back clean**, correcting that
> prediction).
>
> **Screenshot inventory — captured 2026-06-23** (see §1.5 + `screens/`). The 8-viewport
> matrix is now attached, so #84's screenshot AC is satisfied; the verified observations
> are folded into §1 below (notably: ≤320 renders **clean**, contradicting the cautious
> CSS prediction; tablet/landscape/ultrawide confirm the centered-island / stretched-phone
> issues that #88 must fix). Captures are against the **current** layout — #88 should
> re-shoot before/after.

---

## 0. Current state (what the CSS actually does)

The app is **100% fluid today** — there is **not a single width/height media query** in the
codebase. The only `@media` rules are `hover: hover` and `prefers-reduced-motion`. Responsive
behaviour is carried entirely by:

- `clamp()` on type, gaps, paddings, and tap-target heights;
- `svh` units (small viewport height) so the footer never hides behind mobile URL chrome;
- a single `container-type: size` on `.vessel` so the orb readout scales to the orb, not the page;
- `min()` width caps (`min(100%, 30rem)` etc.) that center content on wide screens.

Layout skeleton (`.hp-tracker`, `height: 100svh`, `overflow: hidden`, flex column):

| Row | Selector | Sizing | Behaviour |
|-----|----------|--------|-----------|
| Card | `.hp-tracker__card` | `flex: 1 1 auto`, `max-width: 30rem`, centered | Frames name + orb + panel |
| Stage | `.hp-tracker__stage` | `flex: 1 1 auto`, `min-height: 0` | Holds the orb; shrinks first |
| Orb | `.vessel` | `aspect-ratio: 1`, `max-height: min(76vw, 340px)`, `max-width: 76vw` | **Square, capped at 340px** |
| Panel | `.hp-tracker__panel` | `flex: 0 0 auto`, `height: clamp(5rem, 20svh, 11rem)` | Fixed slot, internal scroll |
| Footer | `.hp-tracker__footer` | `flex: 0 0 auto` | Rest controls, pinned bottom |

Modals/sheets (keypad, coin sheet, HP editor, hit-dice editor) are **bottom sheets / centered
overlays** sized `width: min(100%, NN rem)` — they are already viewport-aware on the width axis
but make **no provision for short landscape height**.

**Manifest:** `src/pwa-manifest.ts` pins `display: "fullscreen"`, `orientation: "portrait"`.

---

## 1. Breakage inventory (CSS-derived predictions — verified in §1.5)

Ordered by viewport, smallest to largest. Each is a hypothesis from the cascade above.

### ≤320 (small phone — iPhone SE 1st-gen 320×568, older Androids)
- **Orb floor too aggressive `[verify]`.** `.vessel { min-height: 4.5rem }` lets the orb collapse to
  72px on short screens. At 320×568 the stage is tall enough, but the orb is also capped at
  `max-width: 76vw` ≈ 243px, and the **HP numeral is `clamp(2rem, 32cqmin, 6rem)`** — at a small
  orb the numeral is fine, but the **gold ring frame** (`box-shadow` rings out to +17px) is *outside*
  `overflow:hidden` and can clip against the 320px card edge minus padding.
- **Keypad keys near floor `[verify]`.** `.keypad { width: min(100%, 23rem) }`, 3-col grid. At 320 −
  insets − sheet padding, key width drops toward the e2e floor (test asserts ≥70px). Likely passes
  but with little margin.
- **Rest buttons may wrap `[verify]`.** `.rest-controls__btn { min-width: 9.5rem }` × 2 + gap = ~20rem;
  the row is `flex-wrap: wrap` at `min(100%, 30rem)`. At ≤320 the two buttons wrap to two lines,
  eating the one-screen budget.

### 360×640 (compact Android — guarded today)
- Covered by `mobile-chrome-360` Playwright project. Generally OK; tight vertical budget.

### 390×844 (iPhone 14 Pro — guarded today, the primary target)
- Covered by `mobile-chrome-390`. The "good on common portrait phones" baseline.

### 430 (large phone — iPhone Pro Max 430×932)
- **Orb stops growing — the headline complaint.** At 430px wide, `76vw` ≈ **327px**, so
  `max-height: min(76vw, 340px)` resolves to **327px** (the `76vw` branch wins — the 340px ceiling
  never binds at this width) and `max-width: 76vw` independently caps the orb's width at **327px**.
  **The active constraint at 430 is `76vw` on both axes, not the 340px ceiling.** The card is
  `max-width: 30rem` (480px). Net: **large screen, ~327px orb floating in dead space** — exactly the
  "card/orb doesn't fill the page" report. *(The 340px ceiling only starts to bind above ~447px
  wide, e.g. landscape; on portrait phones `76vw` is the binding cap.)* `[verify]`
- **Card is narrower than the screen.** 30rem = 480px > 430px, so on a Pro Max the card *does* fill
  width — but the orb inside is still pinned to 76vw, so vertical dead space grows above/below.

### 768 / 1024 (tablet — iPad portrait/landscape)
- **Tiny island on a big canvas `[verify]`.** Card frozen at `max-width: 30rem` (480px) centered on a
  768–1024px screen → a phone-sized card marooned in a sea of obsidian. The orb (≤340px) is a small
  disc mid-screen. Looks broken/unfinished on tablet — and the issue's stated intent is that the
  *larger* canvas is where tablets earn their keep.
- **Bottom sheets look stranded.** Coin sheet `min(100%, 26rem)` centered on a 1024 screen is a
  narrow strip; acceptable but not designed-for.

### Landscape (any phone rotated, e.g. 844×390)
- **The big one.** `height: 100svh` with a flex *column* and `overflow: hidden`. In landscape the
  height collapses to ~390px while the orb wants `aspect-ratio: 1` filling the stage. The fixed panel
  slot (`clamp(5rem,20svh,11rem)` ≈ 78–110px) + footer + name row + orb cannot coexist in 390px.
  **Predicted: orb squashed to its 4.5rem floor or content clipped behind `overflow:hidden`.** `[verify]`
- **Manifest lock is a half-measure.** `orientation: "portrait"` is honored **only for installed PWAs
  on Android-class browsers**. It is **ignored by iOS Safari and every desktop browser tab.** So
  landscape *will* happen in the field regardless of the lock. See §4.

### Ultrawide / desktop (≥1280, browser tab)
- Card centered at 480px in a vast dark field. Functional, visually thin. Lowest priority; the product
  is a phone PWA, but the e2e guard and casual desktop opens should not look broken.

---

## 1.5 Screenshot inventory (captured 2026-06-23, current layout)

Captured headless via Playwright against the production preview, reduced-motion, at the
committed matrix. Files: [`screens/`](screens/). Verified vs the §1 predictions:

| Viewport | File | Observed |
|----------|------|----------|
| 320×568 (small phone) | [320x568.png](screens/320x568.png) | **Clean** — orb, name, hit-dice, rests all fit; no overflow/clip. (§1's ≤320 breakage was over-cautious.) |
| 360×640 | [360x640.png](screens/360x640.png) | Fine (guarded today). |
| 390×844 (primary) | [390x844.png](screens/390x844.png) | Fine (guarded today). |
| 430×932 (large phone) | [430x932.png](screens/430x932.png) | Fine; orb scales up, generous margins. |
| 768×1024 (tablet portrait) | [768x1024-tablet.png](screens/768x1024-tablet.png) | **Stretched phone** — tall column with an awkward orb→hit-dice gap; confirms the "not a stretched phone" tablet need (#88: centered max-width card). |
| 1024×768 (tablet landscape) | [1024x768-tablet-landscape.png](screens/1024x768-tablet-landscape.png) | Centered island; wide black margins. |
| 844×390 (phone landscape) | [844x390-phone-landscape.png](screens/844x390-phone-landscape.png) | Content fits but a **centered island** wastes horizontal width; the name nudges the top edge. |
| 1280×800 (ultrawide) | [1280x800-ultrawide.png](screens/1280x800-ultrawide.png) | **Phone-width column on an empty page** — acceptable by-design (desktop low-priority; centered+capped per §3). |

Net: the **portrait phone path is solid today** (incl. ≤320); the real work is **tablet
(stretched), landscape (wasted width), and the fill-vs-centered decision** — exactly what
§2–§3 commit to and #88 implements.

---

## 2. Committed breakpoints + target viewports

Adopt a **named, px-valued** set so #88 inherits exact numbers, not adjectives. Mobile-first:
base styles target the phone; breakpoints layer **up**.

| Name | Range | Reference device | HP card treatment | Notes |
|------|-------|------------------|-------------------|-------|
| `xs` small phone | **≤ 359** (test ≤320) | iPhone SE, old Android | **Fill, edge-to-edge** | Tightest budget; protect tap targets |
| `sm` standard phone | **360–429** | Pixel 5, iPhone 14 Pro | **Fill, edge-to-edge** | Current baseline; keep |
| `lg` large phone | **430–599** | iPhone Pro Max | **Fill, edge-to-edge** — *raise orb cap* | Fixes the "doesn't fill" complaint |
| `tab` tablet | **600–1023** (switch at **768**) | iPad mini/Air portrait | **Inset, centered canvas** | Card reappears as a framed object |
| `wide` desktop/ultrawide | **≥ 1024** | iPad landscape, laptop | **Centered canvas, capped** | Two-pane optional, not required |
| `land` landscape modifier | `(orientation: landscape)` **and** `max-height ≤ 540` | any phone rotated | **Side-by-side reflow** | Orthogonal to width; see §4 |

**Primary committed support:** `xs`, `sm`, `lg` portrait (the phone PWA). **Must-not-break:** `tab`,
`land`, `wide` (graceful, not pixel-polished). The **canvas-switch threshold is 768px** — below it the
app is "a phone screen that fills the device"; at/above it the app is "a centered game object on a
desk." 600–767 is a buffer zone that stays in fill mode (covers small tablets held like big phones).

---

## 3. Card behaviour — fill-the-viewport vs centered

**Decision (per the issue's stated preference): edge-to-edge fill on phones; inset centered canvas at tablet (≥768).**

### Phones (`xs`/`sm`/`lg`) — *fill, trending edge-to-edge*
The caps that currently block "fill" and must change. **All three must be addressed together** —
raising any one alone leaves another binding:
- `.vessel { max-width: 76vw }` — **this is the constraint that actually binds on portrait phones**
  (at 430px, 76vw ≈ 327px). Raising only the 340px `max-height` ceiling would leave a 430-class phone
  unchanged. Raise/remove this width cap on phones.
- `.vessel { max-height: min(76vw, 340px) }` — the `76vw` term mirrors the width cap above; the 340px
  ceiling only binds above ~447px wide (landscape, tablet). On phones, drive the orb from the
  **available stage height** and width budget, not a fixed 340px. Recommended: `max-height: min(82vw,
  82svh)` with **no hard px cap below `lg`** (or a much higher cap, e.g. 460px), so the orb grows with
  the device.
- `.hp-tracker__card { max-width: 30rem }` — on phones let the card width follow the viewport
  (`max-width: none` / `100%`), and **dissolve the card chrome toward edge-to-edge**: reduce/zero the
  card's own horizontal padding and let the `.hp-tracker` safe-area padding be the only inset. The
  visible "card" border/radius can fade on phones (the background already *is* the card on a fullscreen
  PWA). Content stays bounded by `env(safe-area-inset-*)` even when the *background* goes edge-to-edge —
  edge-to-edge is a paint decision, not a "let text touch the notch" decision.

**Edge-to-edge vs inset on phones:** go **edge-to-edge for the background/orb stage**, keep an **inset
for interactive content** (footer buttons, name) via the existing safe-area padding. This is the most
"intuitive, fills the page" result the issue asks for without sacrificing reachability or notch safety.

### Tablet (`tab` ≥768) — *centered canvas*
Re-introduce the framed card as an intentional object: `max-width` ≈ 34–40rem, centered, with the
card border/shadow/radius **restored** (it's a feature on tablet, noise on phone). The orb can grow to
a comfortable cap (e.g. `min(60svh, 520px)`). This is the threshold where the "larger canvas" the issue
reserves for tablets actually appears. A two-pane layout (orb left, panel/controls right) is **optional**
and should be deferred unless landscape tablet demands it — keep #88 scoped.

### Desktop/ultrawide (`wide`) — centered, capped, low priority
Same centered canvas as tablet with a hard max so it never sprawls. Acceptable to look identical to
tablet. Do not invest in multi-column here.

---

## 4. Orientation rules

**Stance (resolves the manifest/PRD/issue tension): portrait is the designed-for target; landscape is
a degrade-gracefully, must-not-break mode.** Rationale: `orientation: "portrait"` in the manifest is
honored only by installed PWAs on Android-class browsers and is **ignored by iOS Safari and desktop
tabs**, so landscape reaches users regardless. We do not chase landscape polish; we guarantee it
never clips or hides a control.

Landscape trigger: `@media (orientation: landscape) and (max-height: 540px)` — gates the rules to
*short* landscape (rotated phones), not tall landscape tablets which can keep the portrait composition.

| Surface | Portrait | Landscape (short) |
|---------|----------|-------------------|
| **HP screen** | Column: name -> orb -> panel -> footer | **Two columns**: orb on the left (sized to `min(80svh, ...)`), the name + fixed panel + footer stacked on the right. Removes the vertical stacking that overflows 390px height. |
| **Dice tray** *(not yet built — PRD §5.3; rule for when built)* | Bottom sheet, full width | Bottom sheet capped to `max-height: 100svh`; tray grid reflows to more columns / fewer rows so dice + result fit a short height. |
| **Coin sheet** | Bottom sheet `min(100%, 26rem)` | Cap `max-height: 92svh` + internal scroll on `.coins__rows`; keep header/hero/distill pinned. Currently has **no height cap** — landscape risk. `[verify]` |
| **Keypad** | Bottom sheet, 3-col pad | Cap `max-height: 100svh`; consider 2-row-of-buttons compaction or side-by-side amount/pad so all keys stay ≥44px without scrolling. |

All sheets must gain a `max-height: ...svh` + internal scroll so short landscape never clips their
action row (the destructive risk: a "Confirm"/"Apply" button pushed below the fold).

---

## 5. One-screen budget + safe-area

The one-screen budget (no scroll, no bottom clip — enforced by the #32 e2e guard) is the load-bearing
invariant. Per breakpoint:

| Breakpoint | Orb | Panel slot | Footer/controls | Chrome |
|------------|-----|------------|-----------------|--------|
| `xs` ≤359 | smallest; floor protects footer (orb shrinks first via `flex:1`+`min-height:0`) | `clamp(5rem,...)` low end | rest buttons may need to **not wrap** — give them a `flex-shrink` path or stack intentionally | 44px controls fixed |
| `sm`/`lg` | grows with stage; **raise the `76vw` caps (both axes) + 340px ceiling** | unchanged | unchanged | unchanged |
| `tab` | larger cap (≤520px) | can grow | comfortable | unchanged |
| `land` | left column, height-driven | right column | right column, stacked | top-right, clear of inset |

**Safe-area handling (keep + extend the existing pattern):**
- `.hp-tracker` already pads all four sides with `env(safe-area-inset-*)`. Keep this as the single
  source of content inset — especially important once the **background goes edge-to-edge** on phones.
- Bottom sheets already add `env(safe-area-inset-bottom)` to their bottom padding (`.hit-dice__body`,
  `.keypad` via sheet). Audit the **coin sheet** and **HP editor** for the same — and add
  `env(safe-area-inset-left/right)` to sheet padding for **landscape notch** (the notch moves to the
  side when rotated; current sheets only guard top/bottom). `[verify]`
- Keep `svh` (not `dvh`) for the shell height so the footer stays put while the URL bar is visible.

---

## 6. Recommended approach + risks

**Keep fluid `clamp()` as the base; add a *small* set of media-query breakpoints; reserve container
queries for genuinely context-driven components.** Do **not** rewrite to a media-query-per-component
model — the fluid base is good and already passes the e2e guard.

| Technique | Use it for | Why |
|-----------|-----------|-----|
| **Fluid `clamp()` (base, mobile-first)** | type, gaps, paddings, tap heights, orb size within a mode | Already the house style; smooth across `xs`->`lg` with zero breakpoints; one-screen budget falls out naturally |
| **Media queries (small set)** | the **768 canvas switch** (fill -> centered card) and the **landscape reflow** (column -> two-column) | These are *discrete layout-mode* changes, not smooth scaling — exactly what media queries are for |
| **Container queries** | only `.vessel` (already uses `container-type`); optionally future dice tray if it's embedded in variable contexts | Component-context sizing; avoid sprinkling them where a viewport query is clearer |

Concretely: ~**3 media-query blocks** — `min-width: 768px` (centered canvas), the landscape modifier,
and an optional `min-width: 1024px` cap — plus **edits to two existing rules** (`.vessel` max-height,
`.hp-tracker__card` max-width). That's the whole change surface for the HP screen.

**Risks:**
- **R1 — orb cap removal vs one-screen budget.** Raising/removing `max-height` could let the orb push
  the footer off short screens. Mitigation: orb sized from `svh` budget, `flex:1`+`min-height:0` lets
  it shrink first; **e2e guard must run at every new breakpoint** to catch regressions. **High impact.**
- **R2 — landscape two-column is new structure.** The HP screen is a single flex column today; a
  landscape grid is a real layout fork. Mitigation: gate tightly (`max-height:540px`), test explicitly.
- **R3 — edge-to-edge + safe-area on notched phones.** Background to the edge must not let *content*
  reach the notch. Mitigation: content inset stays on `.hp-tracker` env() padding; verify on a notched
  device profile. `[verify]`
- **R4 — sheets without height caps clip in landscape.** Coin sheet / HP editor lack `max-height`.
  Add caps + internal scroll. Destructive-action buttons below the fold is the worst case. `[verify]`
- **R5 — Fraunces/DM Sans clamp at extreme widths.** Hero numeral uses `cqmin` (good); confirm no
  overflow at ≤320 and no absurd size at ultrawide. `[verify]`
- **R6 — gold ring frame escapes `overflow:hidden`.** `.vessel__orb` rings extend +17px outside the
  orb; on narrow cards confirm they don't clip against the card edge. `[verify]`

**Items needing in-browser screenshot verification (carry into #88 QA):** all `[verify]` tags above —
≤320 ring clip, 430 dead-space, 768/1024 marooned card, landscape squash, sheet height clipping,
safe-area on notched + rotated devices.

---

## 7. AC seeds for #88 (responsive-layout implementation)

Copy these into #88 as checkbox acceptance criteria; tighten thresholds during its eng review.

- [ ] **Breakpoints committed in code** matching §2: base (phone, mobile-first) + `min-width:768px`
      (centered canvas) + landscape modifier `(orientation:landscape) and (max-height:540px)` +
      optional `min-width:1024px` cap. No other width breakpoints unless justified.
- [ ] **Orb fills the viewport on phones:** the binding caps on `.vessel` are raised/removed so the orb
      grows with the device on `lg` (430-class) phones — this means the **`max-width: 76vw` *and*
      `max-height: min(76vw, 340px)`** caps (the `76vw` term binds on portrait phones; the 340px ceiling
      binds only above ~447px wide). Raising the 340px ceiling alone does **not** change a 430-class
      phone. Visually verified to no longer float in dead space. **[screenshot]**
- [ ] **Edge-to-edge phone canvas:** `.hp-tracker__card` width follows the viewport on phones and the
      card chrome (border/radius/shadow) is dissolved/edge-to-edge; **content stays inside
      `env(safe-area-inset-*)`** (no text/control under a notch, portrait or landscape). **[screenshot]**
- [ ] **Tablet centered canvas:** at ≥768 the framed card reappears, centered, wider cap
      (~34–40rem), card chrome restored; orb grows to a comfortable cap. **[screenshot at 768 & 1024]**
- [ ] **Landscape does not break** on a rotated phone (e.g. 844×390): HP screen reflows to the
      two-column layout; nothing clipped behind `overflow:hidden`; footer/controls fully on-screen.
      **[screenshot landscape]**
- [ ] **All bottom sheets cap height in landscape:** keypad, coin sheet, HP editor, hit-dice editor get
      `max-height: ...svh` + internal scroll; the primary action button is always reachable without the
      page scrolling. Sheets add `env(safe-area-inset-left/right)` for rotated-notch.
- [ ] **One-screen budget holds at every breakpoint:** no page scroll, no bottom clip, at ≤320 / 360 /
      390 / 430 / 768 / 1024 and at least one landscape viewport.
- [ ] **Tap targets ≥44px** (keypad keys ≥70px wide per existing guard; coin steppers ≥40px; rest
      buttons ≥56px) at every breakpoint — including ≤320 where the budget is tightest.
- [ ] **Rest controls do not wrap-clip at ≤320:** either fit on one row or stack intentionally.
- [ ] **Playwright coverage extended** (`playwright.config.ts` currently only has 360×640 and 390×844
      *portrait*): add projects for **≤320, 430, 768, 1024, and a landscape viewport** so the #32 layout
      guard actually covers the new breakpoints. *(Load-bearing: without this the guard silently misses
      the new responsive surface.)*
- [ ] **Screenshot inventory captured** across ≤320 / 360 / 390 / 430 / 768 / 1024 / landscape /
      ultrawide (the artifact #84 could not produce headless) and attached to the #88 PR for design
      review (per the "design review via visuals" convention).
- [ ] **Dice tray** *(only if built within #88; otherwise defer)*: bottom sheet honours the landscape
      height-cap + safe-area rules in §4.
- [ ] **No design-system regressions:** changes respect `DESIGN.md` (Molten Hoard) — dark-first,
      glanceable, ≥44px targets, gold-earned-not-sprayed, `prefers-reduced-motion` honoured.

---

### Appendix — files read for this spike
- `src/styles.css` — component + theme styling (vessel/orb, keypad, coin sheet, sheets, tier accents).
- `src/App.css` — shell layout (`.hp-tracker__*` rows: card, stage, panel, footer, chrome).
- `playwright.config.ts` — current viewports (360×640, 390×844, portrait only).
- `e2e/layout.spec.ts` — the #32 one-screen / tap-target / orb-stability guard.
- `src/pwa-manifest.ts` — `display: fullscreen`, `orientation: portrait` (the lock discussed in §4).
- `DESIGN.md` §Layout, §Spacing — poster-first HP screen, one-screen budget, tap-target minimums.
- `docs/PRD.md` §5.3 — dice roller is "illustrative, not committed" (why dice tray is forward-looking).
