# Changelog

All notable changes to Hoard are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries describe changes in player-meaningful terms, not raw commit subjects. Once
[release-please](https://github.com/googleapis/release-please) is adopted (#169), the
sections below `Unreleased` will be generated automatically from Conventional Commits.

## [Unreleased]

_Nothing yet — changes land here before the next version is cut._

## [0.0.1] — 2026-06-23

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
