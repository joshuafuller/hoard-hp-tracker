/**
 * Parse the project CHANGELOG.md (release-please / Keep a Changelog format) into
 * structured, player-readable entries for the in-app "What's new" view (#209). Pure +
 * offline — it only transforms the bundled markdown string, never fetches.
 *
 * Recognised shape:
 *   ## [0.0.6](compare-url) (2026-06-23)
 *   ### Fixed
 *   * **scope:** description ([#249](url)) ([#250](url)) ([sha](url))
 */

/** One changelog bullet, split for a player-facing render. */
export interface ChangeItem {
  /** The leading conventional-commit scope (e.g. "dice", "about"), if present — for a
   *  subtle category tag rather than dev-speak in the prose. */
  scope?: string;
  /** The human description, with the `**scope:**` prefix and trailing links stripped. */
  text: string;
  /** Issue refs found in the bullet, e.g. `["#249", "#250"]` (commit shas excluded). */
  refs: string[];
}

/** A titled group of bullets within a version (e.g. "Features", "Fixed"). */
export interface ChangeSection {
  title: string;
  items: ChangeItem[];
}

/** One released version's notes. */
export interface ChangelogEntry {
  version: string;
  /** Release date as written (e.g. "2026-06-23"), or "" if absent. */
  date: string;
  sections: ChangeSection[];
}

const VERSION_RE = /^##\s+\[([^\]]+)\]\([^)]*\)(?:\s*\(([^)]+)\))?/;
const SECTION_RE = /^###\s+(.+?)\s*$/;
const BULLET_RE = /^\*\s+(.+)$/;
const REF_RE = /\[#(\d+)\]/g;
// A parenthetical group that CONTAINS a markdown link — `([#249](url))`, `([sha](url))`,
// or with surrounding prose like `(Copilot+Codex [#219](url))` / `(bot review [#221](url))`.
// Removed wholesale (it's GitHub bookkeeping, not prose).
const LINK_PAREN_RE = /\s*\([^()]*\[[^\]]+\]\([^)]*\)[^()]*\)/g;
// Any remaining inline markdown link → keep just its label (`[label](url)` → `label`).
const INLINE_LINK_RE = /\[([^\]]+)\]\([^)]*\)/g;
// A leading conventional-commit scope: `**dice:** the rest…` → ["dice", "the rest…"].
const SCOPE_RE = /^\*\*([^:*]+):\*\*\s*(.*)$/;

/** Parse CHANGELOG.md markdown into version entries (newest first, as written). */
export function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let entry: ChangelogEntry | null = null;
  let section: ChangeSection | null = null;

  for (const line of md.split("\n")) {
    const v = VERSION_RE.exec(line);
    if (v) {
      entry = { version: v[1]!, date: v[2] ?? "", sections: [] };
      entries.push(entry);
      section = null;
      continue;
    }
    // A top-level `## ` header that ISN'T a version line (e.g. `## Unreleased`, or any
    // non-release H2) CLOSES the current entry, so its content doesn't leak into the
    // previous version (Copilot #209).
    if (/^##\s/.test(line)) {
      entry = null;
      section = null;
      continue;
    }
    if (!entry) continue; // skip the preamble before the first version

    const s = SECTION_RE.exec(line);
    if (s) {
      section = { title: s[1]!, items: [] };
      entry.sections.push(section);
      continue;
    }

    const b = BULLET_RE.exec(line);
    if (b && section) {
      const raw = b[1]!;
      const refs = [...raw.matchAll(REF_RE)].map((m) => `#${m[1]}`);
      const stripped = raw
        .replace(LINK_PAREN_RE, "") // drop "(… [#NN](url) …)" bookkeeping groups
        .replace(INLINE_LINK_RE, "$1") // any remaining markdown link → its label
        .replace(/\s{2,}/g, " ")
        .trim();
      // Pull a leading `**scope:**` out of the prose so the UI can show it as a tag.
      const m = SCOPE_RE.exec(stripped);
      const item: ChangeItem = m
        ? { scope: m[1]!, text: m[2]!.trim(), refs }
        : { text: stripped, refs };
      section.items.push(item);
    }
  }
  return entries;
}
