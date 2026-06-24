import { describe, expect, it } from "vitest";
import { parseChangelog } from "./changelog";

const SAMPLE = `# Changelog

Some preamble that must be ignored.

## [0.0.6](https://x/compare/v0.0.5...v0.0.6) (2026-06-23)


### Fixed

* **about:** close ✕ was covered by the panel hero — lift it with z-index ([#249](https://x/issues/249)) ([#250](https://x/issues/250)) ([27d94df](https://x/commit/27d94df))
* **sound:** resume the AudioContext before scheduling cues ([#248](https://x/issues/248)) ([#252](https://x/issues/252))

## [0.0.5](https://x/compare/v0.0.4...v0.0.5) (2026-06-22)


### Features

* **haptics:** authentic tactile feel — shared module + felt heartbeat ([#245](https://x/issues/245))
`;

describe("parseChangelog (#209)", () => {
  const entries = parseChangelog(SAMPLE);

  it("returns one entry per version header, newest first, ignoring the preamble", () => {
    expect(entries.map((e) => e.version)).toEqual(["0.0.6", "0.0.5"]);
  });

  it("captures the release date", () => {
    expect(entries[0]!.date).toBe("2026-06-23");
  });

  it("groups bullets under their section title", () => {
    const v6 = entries[0]!;
    expect(v6.sections.map((s) => s.title)).toEqual(["Fixed"]);
    expect(v6.sections[0]!.items).toHaveLength(2);
  });

  it("splits the scope out and strips link clutter, keeping issue refs", () => {
    const item = entries[0]!.sections[0]!.items[0]!;
    expect(item.scope).toBe("about"); // leading **scope:** pulled out for a tag
    expect(item.text).toBe("close ✕ was covered by the panel hero — lift it with z-index");
    expect(item.refs).toEqual(["#249", "#250"]); // commit sha excluded
  });

  it("leaves text scope-less when there's no **scope:** prefix", () => {
    const e = parseChangelog("## [1.0.0](u) (2026-01-01)\n### Fixed\n* a plain note, no scope\n");
    const item = e[0]!.sections[0]!.items[0]!;
    expect(item.scope).toBeUndefined();
    expect(item.text).toBe("a plain note, no scope");
  });

  it("parses a Features section on another version", () => {
    const v5 = entries[1]!;
    expect(v5.sections[0]!.title).toBe("Features");
    expect(v5.sections[0]!.items[0]!.refs).toEqual(["#245"]);
  });

  it("a non-version H2 (e.g. ## Unreleased) closes the entry — content doesn't leak (Copilot)", () => {
    const md = [
      "## [0.0.6](https://x/compare) (2026-06-23)",
      "### Fixed",
      "* a real fix",
      "",
      "## Unreleased",
      "",
      "### Features",
      "* must NOT attach to 0.0.6",
    ].join("\n");
    const e = parseChangelog(md);
    expect(e).toHaveLength(1); // only the versioned entry
    expect(e[0]!.sections).toHaveLength(1); // just "Fixed"; the post-Unreleased section is dropped
  });

  it("skips old-style + Unreleased headings amid release-please ones without leaking (#261)", () => {
    // CHOICE: only release-please linked headings (`## [x](url) (date)`) are parsed as
    // releases. `## [Unreleased]` and old-style `## [0.0.1] - 2026-06-23` (no link) are
    // SAFELY SKIPPED — they close the current entry so their sections never leak into the
    // prior release. The bundled CHANGELOG is release-please-generated, so this loses nothing.
    const md = [
      "# Changelog",
      "## [0.0.6](https://x/c) (2026-06-23)",
      "### Fixed",
      "* real fix",
      "## [Unreleased]",
      "### Added",
      "* unreleased note — must NOT leak",
      "## [0.0.1] - 2026-06-23", // old-style, no link
      "### Changed",
      "* old note — must NOT leak",
    ].join("\n");
    const e = parseChangelog(md);
    expect(e).toHaveLength(1); // only the release-please entry is parsed
    expect(e[0]!.version).toBe("0.0.6");
    expect(e[0]!.sections.map((s) => s.title)).toEqual(["Fixed"]); // nothing leaked in
    expect(e[0]!.sections[0]!.items[0]!.text).toBe("real fix");
  });

  it("strips link-bearing parentheticals (even with surrounding prose) + inline links (Codex #266)", () => {
    const md = [
      "## [1.0.0](u) (2026-01-01)",
      "### Fixed",
      "* **ci:** deflaked the share test (Copilot+Codex [#219](https://x/219)) ([#221](https://x/221))",
      "* see the [docs](https://x/docs) for more",
    ].join("\n");
    const items = parseChangelog(md)[0]!.sections[0]!.items;
    expect(items[0]!.scope).toBe("ci");
    expect(items[0]!.text).toBe("deflaked the share test"); // no raw markdown leaks
    expect(items[0]!.refs).toEqual(["#219", "#221"]);
    expect(items[1]!.text).toBe("see the docs for more"); // inline link → its label
  });
});
