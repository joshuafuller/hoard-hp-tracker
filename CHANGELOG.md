# Changelog

All notable changes to Hoard are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe changes in player-meaningful terms, not raw commit subjects. Once
[release-please](https://github.com/googleapis/release-please) is adopted (#169), the
sections below `Unreleased` will be generated automatically from Conventional Commits.

## [0.0.13](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.12...v0.0.13) (2026-06-24)


### Added

* **tour:** 'name your character' onboarding step ([#179](https://github.com/joshuafuller/hoard-hp-tracker/issues/179)) ([#284](https://github.com/joshuafuller/hoard-hp-tracker/issues/284)) ([89e9489](https://github.com/joshuafuller/hoard-hp-tracker/commit/89e94898504d73770e3c85e5017106d2cc91d5a8))

## [0.0.12](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.11...v0.0.12) (2026-06-24)


### Added

* **layout:** responsive — phone-fill, tablet card, landscape reflow ([#88](https://github.com/joshuafuller/hoard-hp-tracker/issues/88)) ([#270](https://github.com/joshuafuller/hoard-hp-tracker/issues/270)) ([89fc3a7](https://github.com/joshuafuller/hoard-hp-tracker/commit/89fc3a79e472f74016ae2708c7347970f994d564))

## [0.0.11](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.10...v0.0.11) (2026-06-24)


### Added

* **sound:** temp-HP shimmer + prefers-reduced-motion simplification ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90)) ([#273](https://github.com/joshuafuller/hoard-hp-tracker/issues/273)) ([40106c5](https://github.com/joshuafuller/hoard-hp-tracker/commit/40106c5c42d1d887cab030c3fe8405f9bf113ae7))

## [0.0.10](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.9...v0.0.10) (2026-06-24)


### Added

* **sound:** death-save pip cues ([#90](https://github.com/joshuafuller/hoard-hp-tracker/issues/90) slice) ([#271](https://github.com/joshuafuller/hoard-hp-tracker/issues/271)) ([f1ad193](https://github.com/joshuafuller/hoard-hp-tracker/commit/f1ad19342aab65222fd00d3e6ab40e717eb189e0))


### Fixed

* **changelog:** mixed-heading parsing + hardened render key ([#261](https://github.com/joshuafuller/hoard-hp-tracker/issues/261)) ([#275](https://github.com/joshuafuller/hoard-hp-tracker/issues/275)) ([db392c5](https://github.com/joshuafuller/hoard-hp-tracker/commit/db392c557d573c4e2645b45eb17c2c019bc7f9d6))
* **coins:** clear save-error banner after a successful coin write ([#260](https://github.com/joshuafuller/hoard-hp-tracker/issues/260)) ([#274](https://github.com/joshuafuller/hoard-hp-tracker/issues/274)) ([d6c3683](https://github.com/joshuafuller/hoard-hp-tracker/commit/d6c3683728225bcf6e433e3c0833c7711289d109))
* **dice:** resilient, silent best-effort roll-history persistence ([#263](https://github.com/joshuafuller/hoard-hp-tracker/issues/263)) ([#276](https://github.com/joshuafuller/hoard-hp-tracker/issues/276)) ([b5e9c5d](https://github.com/joshuafuller/hoard-hp-tracker/commit/b5e9c5d1b8629c9926d96113febfcce412e057b9))

## [0.0.9](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.8...v0.0.9) (2026-06-24)


### Added

* **tour:** guided-tour step engine ([#177](https://github.com/joshuafuller/hoard-hp-tracker/issues/177)) ([#257](https://github.com/joshuafuller/hoard-hp-tracker/issues/257)) ([9ba650f](https://github.com/joshuafuller/hoard-hp-tracker/commit/9ba650febf53a72c85c47c28ac188e971c34ea0e))

## [0.0.8](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.7...v0.0.8) (2026-06-24)


### Added

* **about:** in-app 'What's new' changelog from the version line ([#209](https://github.com/joshuafuller/hoard-hp-tracker/issues/209)) ([#256](https://github.com/joshuafuller/hoard-hp-tracker/issues/256)) ([b9c0b93](https://github.com/joshuafuller/hoard-hp-tracker/commit/b9c0b934441a58a189c81bb42fc75463b766f529))

## [0.0.7](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.6...v0.0.7) (2026-06-24)


### Fixed

* **sound:** heartbeat silent after mobile reload — prime audio on first gesture ([#253](https://github.com/joshuafuller/hoard-hp-tracker/issues/253)) ([#254](https://github.com/joshuafuller/hoard-hp-tracker/issues/254)) ([efb6b7f](https://github.com/joshuafuller/hoard-hp-tracker/commit/efb6b7fb4a5c92f83dae183959f5c0634e280218))

## [0.0.6](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.5...v0.0.6) (2026-06-23)


### Fixed

* **about:** close ✕ was covered by the panel hero — lift it with z-index ([#249](https://github.com/joshuafuller/hoard-hp-tracker/issues/249)) ([#250](https://github.com/joshuafuller/hoard-hp-tracker/issues/250)) ([27d94df](https://github.com/joshuafuller/hoard-hp-tracker/commit/27d94df8abaaa8ea8e115d7dfb781de94e5ef0a2))
* **sound:** resume the AudioContext before scheduling cues ([#248](https://github.com/joshuafuller/hoard-hp-tracker/issues/248)) ([#252](https://github.com/joshuafuller/hoard-hp-tracker/issues/252)) ([5d88825](https://github.com/joshuafuller/hoard-hp-tracker/commit/5d8882562bca01e80e6734bd32797a61cdd54ee1))

## [0.0.5](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.4...v0.0.5) (2026-06-23)


### Added

* **haptics:** authentic tactile feel — shared module + felt heartbeat ([#245](https://github.com/joshuafuller/hoard-hp-tracker/issues/245)) ([#246](https://github.com/joshuafuller/hoard-hp-tracker/issues/246)) ([373788e](https://github.com/joshuafuller/hoard-hp-tracker/commit/373788e27efd2a80379940382da457fc74aba5ab))

## [0.0.4](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.3...v0.0.4) (2026-06-23)


### Added

* **dice:** nat-1/20 sound + visual flourish via the onCrit hook ([#92](https://github.com/joshuafuller/hoard-hp-tracker/issues/92)) ([#237](https://github.com/joshuafuller/hoard-hp-tracker/issues/237)) ([25c8659](https://github.com/joshuafuller/hoard-hp-tracker/commit/25c86597a79394d74b91e9dd59f93d728c84beb9))
* **sound:** audible heartbeat — synth bass lub-dub synced to the orb pulse ([#243](https://github.com/joshuafuller/hoard-hp-tracker/issues/243)) ([#244](https://github.com/joshuafuller/hoard-hp-tracker/issues/244)) ([51ade00](https://github.com/joshuafuller/hoard-hp-tracker/commit/51ade00e9281a7300fe5acaea58c2faeca123590))


### Fixed

* **about:** 44px tap target for the close (✕) button ([#238](https://github.com/joshuafuller/hoard-hp-tracker/issues/238)) ([#242](https://github.com/joshuafuller/hoard-hp-tracker/issues/242)) ([4ad52f3](https://github.com/joshuafuller/hoard-hp-tracker/commit/4ad52f3fb4ad8642963b90afbf9ff861f338b9ef))
* **hp:** heartbeat is a visible colour flush ON the orb, not a backdrop glow ([#239](https://github.com/joshuafuller/hoard-hp-tracker/issues/239)) ([#240](https://github.com/joshuafuller/hoard-hp-tracker/issues/240)) ([ea40056](https://github.com/joshuafuller/hoard-hp-tracker/commit/ea40056d04dfae34a1110a99b0a077107e06e7dc))

## [0.0.3](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.2...v0.0.3) (2026-06-23)


### Added

* **dice:** pluggable roll-effects architecture ([#87](https://github.com/joshuafuller/hoard-hp-tracker/issues/87)) ([da6463f](https://github.com/joshuafuller/hoard-hp-tracker/commit/da6463fac93d90e8a58ccaf3011a1a11f367fb09))
* **dice:** pluggable roll-effects architecture ([#87](https://github.com/joshuafuller/hoard-hp-tracker/issues/87)) ([19daef1](https://github.com/joshuafuller/hoard-hp-tracker/commit/19daef15a14bebca7b7b163881b1f5ee82265d86))
* **hp:** heartbeat pulse on the orb that quickens as HP nears 0 ([#220](https://github.com/joshuafuller/hoard-hp-tracker/issues/220)) ([0b9b5c9](https://github.com/joshuafuller/hoard-hp-tracker/commit/0b9b5c984ef9727bb2f6a148a874141229f8f0e2))
* **hp:** heartbeat pulse on the orb that quickens as HP nears 0 ([#220](https://github.com/joshuafuller/hoard-hp-tracker/issues/220)) ([9a396d3](https://github.com/joshuafuller/hoard-hp-tracker/commit/9a396d3132c93dc6b615d7c990688c4df995034a))


### Fixed

* **dice:** bus swallows async rejections; onClear before disposal + on re-roll ([#87](https://github.com/joshuafuller/hoard-hp-tracker/issues/87)) ([9784188](https://github.com/joshuafuller/hoard-hp-tracker/commit/9784188ac09062d3a340f9a88a287c695e27a5b8))
* **hp:** orb-drag can apply 1 HP — count travel from the tap threshold ([#228](https://github.com/joshuafuller/hoard-hp-tracker/issues/228)) ([2ec06e7](https://github.com/joshuafuller/hoard-hp-tracker/commit/2ec06e777693de2354332b6b7df4633f733b3f74))
* **hp:** orb-drag can apply 1 HP — count travel from the tap threshold ([#228](https://github.com/joshuafuller/hoard-hp-tracker/issues/228)) ([16a694f](https://github.com/joshuafuller/hoard-hp-tracker/commit/16a694fc016da737c5fd26afbe0aba11e476f0c3))

## [0.0.2](https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.1...v0.0.2) (2026-06-23)


### Added

* **hp:** bloodied reads red at the half line — rules-led danger tiers ([#164](https://github.com/joshuafuller/hoard-hp-tracker/issues/164)) ([7f583a1](https://github.com/joshuafuller/hoard-hp-tracker/commit/7f583a14ebea8026db2afadd876a95e35728baf9))
* **hp:** bloodied reads red at the half line — rules-led danger tiers ([#164](https://github.com/joshuafuller/hoard-hp-tracker/issues/164)) ([764a0ed](https://github.com/joshuafuller/hoard-hp-tracker/commit/764a0ed1bd68253c3c150420746d04ddd0595956))
* **release:** build identity (__BUILD__) + release-please automation ([#169](https://github.com/joshuafuller/hoard-hp-tracker/issues/169)) ([8f89587](https://github.com/joshuafuller/hoard-hp-tracker/commit/8f89587eb365a594c06628c1ce3b948fb14762d3))
* **release:** build identity + release-please automation ([#169](https://github.com/joshuafuller/hoard-hp-tracker/issues/169)) ([498b0a5](https://github.com/joshuafuller/hoard-hp-tracker/commit/498b0a53aaf122685e7da753086ec530bbd66335))


### Fixed

* **commit:** cross-platform, non-clobbering hook wiring (Copilot+Codex [#219](https://github.com/joshuafuller/hoard-hp-tracker/issues/219)) ([74fd9f2](https://github.com/joshuafuller/hoard-hp-tracker/commit/74fd9f2654fc796e820b99fb4721b0cab2cdef69))
* **hp:** readable critical accent + shared thresholds (bot review [#221](https://github.com/joshuafuller/hoard-hp-tracker/issues/221)) ([ed6ed30](https://github.com/joshuafuller/hoard-hp-tracker/commit/ed6ed3008cf007dce794ef3612187566ff117fc5))

## [Unreleased]

_Nothing yet — changes land here before the next version is cut._

## [0.0.1] - 2026-06-23

The honest pre-release: Hoard's first tracked version. A single player's offline,
at-the-table utility belt — HP, coins, and dice — with no accounts and no servers.

### Added
- **Liquid HP orb** — track current/max HP by tapping or dragging the orb; the fill
  responds as you take damage and heal.
- **Quick-entry keypad** — tap the HP number to set, damage, or heal by an exact amount.
- **Temp HP** — a distinct sapphire overshield layered over the base HP.
- **Coins** — track coin denominations with steppers and a keypad, with one-tap
  **distill** (convert up) and **undo**.
- **Dice tray** — build a roll from dice chips and throw physical 3D dice; the roll log
  shows each die so a result is walkable to its total.
- **Radial hub** — a single sigil opens coins, dice, the About panel, and the sound and
  concentration toggles.
- **Concentration** — taking damage while concentrating prompts a save with Keep/Drop.
- **Rests & death saves** — short/long rest and death-save tracking at the table.
- **Name your character** — a discoverable, tap-to-edit character name.
- **Share Hoard** — share the app via the native share sheet, with a copy-link fallback.
- **App version in About** — the running build's version is shown in the About panel.
- **"Updated to vX" toast** — a subtle, dismissible notice after a silent PWA update.
- **Offline-first PWA** — installable to a phone's home screen and fully usable offline;
  all state persists locally (IndexedDB), no accounts, no network.

### Changed
- Roll-log dice are ordered so a roll is easy to verify (walk the dice to the total).

### Fixed
- Max-HP (HP Total) editor no longer renders off the right edge on narrow viewports.
- Roll-log scrollbar no longer overlaps the result totals.

[Unreleased]: https://github.com/joshuafuller/hoard-hp-tracker/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/joshuafuller/hoard-hp-tracker/releases/tag/v0.0.1
