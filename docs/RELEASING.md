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

### Security & the release-PR merge ritual

The pipeline is **secret-free by design** — release-please runs on the built-in, ephemeral
`GITHUB_TOKEN` (no PAT, nothing stored: `gh secret list` is empty). The only repo setting it needs
is **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests"**
(set via `gh api repos/<owner>/<repo>/actions/permissions/workflow -F can_approve_pull_request_reviews=true`).

GitHub deliberately does **not** run CI on PRs created by `GITHUB_TOKEN` (anti-recursion), so the
release PR shows **no checks** and branch protection blocks a normal merge. Resolve it by
**admin-merging the release PR** (`gh pr merge <n> --merge --admin`): its contents are mechanical
(version bump + `CHANGELOG.md`) and the code already passed CI on `main` before the release was cut,
so the e2e/lint/mutation gates were already satisfied. This keeps the repo at **zero long-lived
secrets** — the most secure option. (If admin-merging ever becomes a burden, switch the workflow to a
**GitHub App** token via `actions/create-github-app-token` — still short-lived/ephemeral, and
App-created PRs *do* trigger CI — at the cost of a one-time App create + install. A classic PAT is
**not** recommended: it's a long-lived secret.)

### Commit format is enforced locally

A **`commit-msg` git hook** (`.githooks/commit-msg` → `scripts/lint-commit-msg.mjs`) rejects commits
whose header isn't a valid Conventional Commit, so malformed messages never reach `main` and
release-please always has clean input. It's wired automatically by the `prepare` npm script
(`scripts/setup-hooks.mjs` — cross-platform, skips non-git checkouts, won't clobber a custom
`core.hooksPath`) on `pnpm install` — no Husky/commitlint dependency. The
validator is unit-tested (`scripts/lint-commit-msg.test.ts`). Git-generated merge/revert/fixup
messages are allowed through.

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
  **main-only** — PRs target `main`; deploy is production-only. The former `beta` → `/beta/` Pages
  sub-app has been retired (#215).
- **Release** is a named, tagged checkpoint cut by merging the release PR. Deploys happen far more
  often than releases; `__BUILD__` traces the in-between builds.
