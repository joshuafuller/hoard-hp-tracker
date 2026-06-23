// Conventional-Commits validator for the `commit-msg` git hook (#release tooling).
//
// Enforces the commit-header format release-please parses (`type(scope)?!?: subject`),
// so every commit feeds the automated changelog/version bump cleanly (see
// docs/RELEASING.md, #169). Dependency-free (plain Node) and run from .githooks/commit-msg.
//
// `validateCommitMessage` is exported pure so it's unit-tested in vitest.

/** Types release-please maps to changelog sections, plus the standard hidden ones. */
const TYPES = ["feat", "fix", "perf", "refactor", "revert", "docs", "chore", "test", "ci", "build", "style"];

const HEADER_RE = new RegExp(`^(${TYPES.join("|")})(\\([a-z0-9._\\-/]+\\))?(!)?: (.+)$`);

// Git-generated or tooling commits that are not hand-authored conventional commits.
// Let them through rather than block a merge/revert/rebase-fixup.
const SKIP_RE = /^(Merge |Revert "|Reverts |fixup! |squash! |amend! )/;

const MAX_HEADER = 100;

/**
 * @param {string} message Raw commit message (header + optional body).
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCommitMessage(message) {
  const lines = String(message ?? "").split(/\r?\n/);
  // First line that isn't a comment or blank is the header (git strips `#` comments).
  const header = lines.find((l) => l.trim() !== "" && !l.startsWith("#")) ?? "";

  if (SKIP_RE.test(header)) return { valid: true };

  if (header.length > MAX_HEADER) {
    return { valid: false, error: `Commit header is ${header.length} chars; keep it ≤ ${MAX_HEADER}.` };
  }

  const m = HEADER_RE.exec(header);
  if (!m || m[4].trim() === "") {
    return { valid: false, error: errorText(header) };
  }
  return { valid: true };
}

function errorText(header) {
  return [
    `Invalid commit message — it must follow Conventional Commits (release-please parses these):`,
    ``,
    `  <type>(optional-scope)(optional !): <description>`,
    ``,
    `  types: ${TYPES.join(", ")}`,
    `  e.g.   feat(coins): add platinum`,
    `         fix(hp): bound the editor column`,
    `         feat(api)!: drop the legacy endpoint   (breaking)`,
    ``,
    `  got:   ${header || "(empty)"}`,
  ].join("\n");
}

// ── Run as a hook: `node scripts/lint-commit-msg.mjs <path-to-COMMIT_EDITMSG>` ──
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync } = await import("node:fs");
  const file = process.argv[2];
  if (!file) {
    console.error("lint-commit-msg: no commit message file passed");
    process.exit(2);
  }
  const result = validateCommitMessage(readFileSync(file, "utf8"));
  if (!result.valid) {
    console.error(`\n✖ ${result.error}\n`);
    process.exit(1);
  }
}
