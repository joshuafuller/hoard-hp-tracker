# Roadmap & Working Order

How we decide **what** to work on and **when**, so we stop causing rework. Issues are the source of
truth; this groups them into **epics**, maps **dependencies**, and proposes a **phased order**. It
also sets the **testing & quality bar**. Re-read before starting a new thread of work.

## Guiding principle

> Do the work that **prevents rework** first: testing visibility, spikes before features, bugs before
> building more on top of them, and shared architecture before the features that ride it.

Three classes of "do-it-first" work:
1. **Visibility** — tests that fail loudly while we code (so mistakes surface in the PR, not in prod).
2. **De-risking** — spikes that decide an approach before we build the expensive thing.
3. **Foundations** — shared architecture/bug-fixes that later work depends on.

---

## Epics

| Epic | Issues | State |
|------|--------|-------|
| **A. Quality & Test Infrastructure** | #161 (→ #170–#176, **#186** reconcile test), #43 (CI speed), #33 (esbuild advisory) | active — highest leverage |
| **B. Dice engine correctness** | #184 ✅ (Hit-Die discard, done), #108 (explode + keep/drop / penetrate / reroll composition, bug — fix in **PR #194**) | bugs — fix before more dice work |
| **C. PWA & distribution** | #166 (show version), #167 (update toast), #169 (release-please + build id), #183 (share link) | small, high-visibility wins |
| **D. Onboarding & discoverability** | #168 (in-app tour → #177–#181), #163 (name discoverability), #154 (install help) | #163/#154 fold into the tour |
| **E. Visual & effects polish** | #164 (bloodied → red), #95 (temp HP), #87 (effects arch) → #92 (nat-1/20) + #91 (burning), #88 (responsive) | gated on spikes (#84/#86) + arch (#87) |
| **Roll-log polish** | #189 (scrollbar overlaps totals, bug), #190 (sort dice so a roll is walkable) | small UI fixes — Phase 0 |
| **F. Sound** | #90 (remaining: death-save pips, dice settle/crit), #83 (real-device clatter tuning) | nearly done |
| **G. Repo tidiness** | #193 (epic) → #191 (docs/ index + structure), #192 (remove Claude-era artifacts/assets) | after Phase 0 bugs |
| **Design spikes** | #84 (responsive strategy), #86 (burning-dice feasibility) | unblock Epic E |

---

## Dependency map (what blocks what)

```
SPIKES (decide-before-build)        ARCH (build-before-features)
  #84 responsive  ──▶ #88            #87 effects arch ──▶ #92 nat-1/20
  #86 burning     ──▶ #91                             └─▶ #91 burning  (also needs #86)

TOUR                                 PWA VERSION STORY (interlocked — do together)
  #177 step engine ──▶ #178 content   #166 version ──┐
                   ├─▶ #179 name (#163)              ├─▶ #167 'updated' toast
                   ├─▶ #180 install (#154)           └─▶ #169 release-please
                   └─▶ #181 first-run/replay

TEST INFRA (visibility for everything after)
  #170 dice-path e2e ─ guards ▶ #184 + #108 (dice bugs)
  #176 e2e-required  ─ blocks red e2e (prevents the #137 class of bug)
  #43  CI speed      ─ faster local/CI feedback while coding
```

**The rework traps to avoid:**
- Building **#88 responsive** before **#84** decides the strategy → likely a rewrite.
- Building **#92 / #91 effects** before **#87** defines the hook architecture → bespoke wiring we rip out.
- More **dice features** before **#108** is fixed → stacking on buggy composition (#184 is now fixed).
- Shipping UI without **e2e visibility (#170 ✅, #176)** → flow regressions reach prod because the e2e
  check isn't a merge gate yet (#176). _(Correction: an earlier draft cited #137 as a prod regression —
  #137 is actually a merged control-refactor feature, not an incident; the risk is the missing gate, not that PR.)_

---

## Proposed phased order

> **Status (updated mid-session) — issues are the source of truth; verify state before picking up:**
> #170 and #184 are **DONE** (merged + closed). #108 is **partially done** — headless path fixed
> (PR #194); the WebGL reconcile remainder is tracked in **#186**. #164's DESIGN.md contract was
> reconciled (PR #195) but the **code retune + the open shade/band decision still remain**.
> Remaining Phase 0: #176, #166/#167/#169, #164 (code), #163, #183, #43, #33.

**Phase 0 — Foundations & quick wins.** Highest leverage, low risk, unblocks the rest.
1. ✅ **#170** real dice-path e2e — DONE (headless-scoped; the WebGL reconcile e2e is #186).
2. ✅ **#184** Hit-Die discard — DONE.  ◐ **#108** dice composition — headless DONE (#194), WebGL reconcile → #186.
3. **#176** make the e2e check *required* on beta.
4. **PWA version story** #166 + #167 + #169 (small, visible, "feels maintained").
5. **#164** bloodied → red — DESIGN.md reconciled (#195); **code (`hpColor`/`tierFor`) + the open shade/band decision remain**. **#163** name discoverability.
6. **#183** share link; **#43** CI speed; **#33** esbuild advisory — NOTE: the lockfile already resolves the safe **esbuild 0.25.12** (advisory affects ≤0.24.2), so this is likely just adding an explicit override + closing, **not** the "vite-7 bump" once assumed — verify.
7. **Roll-log fixes** #189 (scrollbar overlaps totals — a bug, do early); #190 (sort dice so a roll is walkable).
8. **e2e expansion** #171–#175 (Epic A child specs) + **#186** (WebGL reconcile test); then **repo tidiness** Epic G (#193 → #191/#192) — sequenced *after* the Phase 0 bugs so it doesn't collide with in-flight fixes.

**Phase 1 — De-risk the big features.** Spikes + arch, so Phase 2 doesn't get rewritten.
- **#84** responsive spike → then **#88**. **#86** + **#87** → then **#92** / **#91**.

**Phase 2 — Big features (post-spike).**
- **#88** responsive; **#168** in-app tour (engine #177 first, then steps #178–#181); effects **#92/#91**; **#95** temp HP.

**Phase 3 — Finish & polish.** Remaining **#90** sound cues, **#83** device tuning.

---

## Testing & quality strategy

The recent dice P2s (#184, #108) are unit-mockable blind spots a real e2e would have caught — direct
evidence we need broader coverage *and* more visibility while coding.

**Coverage gaps (what we're NOT testing well):** the real WebGL dice path, coin flows, the radial
hub, persistence, offline/PWA, the concentration prompt — all unit-mocked. → Epic A / #161 children.

**Visibility while coding (the point):**
- `pnpm test` is `vitest run` (single-run). Use **`pnpm test:watch`** (added — runs `vitest` in watch
  mode) and keep it open while building, so unit failures surface immediately as files change.
- Add a documented `pnpm e2e:watch` (headed, `--ui`) loop so e2e runs *as you build* the feature, not
  just in CI. Surface failures in the PR, not prod.
- **#176**: make the playwright check *required* on beta so a red e2e blocks merge.

**Are we testing the right things?**
- **Domain** (`src/domain/`): example + property (fast-check) + **mutation ≥90%** — strong; keep.
- **UI**: behaviour-tested (RTL) but no coverage *floor* — untested branches can slip in. → add a
  **Vitest coverage gate** (lines/branches) on `src/` so new code must be exercised.
- **Flows**: thin. → the #161 e2e expansion is the gap that matters most.
- **Visual**: the layout guard checks geometry, not pixels. → optional later: screenshot-diff the orb
  tiers / hub (the capture pipeline already exists).

**Measurable quality bar (proposed, do as part of Epic A):**
- [ ] e2e **required** on beta (#176).
- [ ] Vitest **coverage threshold** in CI (start at current %, ratchet up).
- [ ] A **pre-push** hook (lint + typecheck + unit) for fast local feedback before CI.
- [ ] **CI speed** (#43) so the above stays fast enough to keep on.
- [ ] Keep the **mutation gate** on the domain; consider extending to high-risk UI logic.
- [ ] **Definition of Done** per issue: AC checked off + tests (unit + e2e where a user flow exists).

---

## How to use this

- Pick the **lowest unblocked item in the current phase**; don't jump ahead into a spike-gated feature.
- One focused PR per issue; epics are tracking views, not PRs.
- When something is flagged that would change ordering (a new dependency, a spike result), update this
  doc in the same PR.
