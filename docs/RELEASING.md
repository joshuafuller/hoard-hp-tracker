# Releasing & versioning

How Hoard versions itself and cuts releases. The aim is the **most streamlined** flow for a
solo, continuously-deployed PWA: no manual version math, automatic changelogs, and a version
users can see. Two layers — an always-on build identity, and named releases driven by commits.

## 1. Build identity — always on, zero effort

Every build injects two compile-time constants (see `vite.config.ts` `define`):

- `__APP_VERSION__` — `package.json` version. Shown in **About** as `vX.Y.Z` (#166).
- `__BUILD__` — `git describe --tags --always --dirty` + the build date. Shown in **About**
  beneath the version (#169), so every build is uniquely traceable **even between named
  releases**. Falls back to `vX.Y.Z · <date>` when git is unavailable (e.g. tarball builds).

The PWA update toast (#167) reads `__APP_VERSION__`, so after an update it shows the new
version number.

## 2. Named releases — driven by the commits we already write

We use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`,
`refactor:`, `chore:`, `test:`, `ci:`). [**release-please**](https://github.com/googleapis/release-please)
(`.github/workflows/release-please.yml`) reads them on every push to `main` and maintains a
**release PR** that bumps `package.json` and updates `CHANGELOG.md`.

- **Merging the release PR** tags `vX.Y.Z`, cuts a **GitHub Release** with notes, and lands the
  changelog/version bump. That merge is the **only manual step** — do it when you want to ship a
  named version.
- Config lives in `release-please-config.json` + `.release-please-manifest.json` (current version
  is pinned there).

### Bump rules (SemVer)

While the app is **pre-1.0** (`0.y.z`), bumps stay conservative (config:
`bump-minor-pre-major` + `bump-patch-for-minor-pre-major`):

| Commit type | Pre-1.0 bump | Post-1.0 bump |
|-------------|--------------|----------------|
| `fix:` | patch (`0.0.1 → 0.0.2`) | patch |
| `feat:` | patch (`0.0.1 → 0.0.2`) | minor |
| `feat!:` / `BREAKING CHANGE:` | minor (`0.0 → 0.1`) | major |
| `docs:`/`chore:`/`test:`/`ci:` | none (hidden from changelog) | none |

We start honestly at **0.0.1** and move to `1.0.0` only when the app is feature-complete enough
to call it a real release.

## Deploy vs release

- **Deploy** is continuous: every merge to `main` deploys the live PWA (GitHub Pages). Development is
  **main-only** — PRs target `main` and no active `beta` branch is maintained. (The Pages deploy,
  CI/E2E workflows, and the service-worker config still *conditionally* build a `/beta/` sub-app **if**
  a `beta` branch exists — residual machinery that simply lies dormant while none does.)
- **Release** is a named, tagged checkpoint cut by merging the release PR. Deploys happen far more
  often than releases; `__BUILD__` traces the in-between builds.
