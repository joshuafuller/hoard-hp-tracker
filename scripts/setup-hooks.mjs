// Wire the repo's git hooks on `pnpm install` (the `prepare` script).
//
// Cross-platform (plain Node, not a POSIX shell one-liner — Copilot #219) and
// non-destructive: skips outside a git work tree (e.g. tarball installs) and
// won't clobber a `core.hooksPath` a contributor has deliberately set elsewhere
// (Codex #219). Points git at .githooks so the commit-msg validator runs.

import { execSync } from "node:child_process";

function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

try {
  git("rev-parse --is-inside-work-tree");
} catch {
  process.exit(0); // not a git checkout (CI tarball, published package) — nothing to wire
}

let current = "";
try {
  current = git("config --get core.hooksPath");
} catch {
  /* unset — fine */
}

if (current && current !== ".githooks") {
  console.warn(
    `[hooks] core.hooksPath is already '${current}'; leaving it. ` +
      `Run \`git config core.hooksPath .githooks\` to enable Hoard's commit-msg lint.`,
  );
  process.exit(0);
}

try {
  git("config core.hooksPath .githooks");
} catch {
  /* best-effort; never fail the install over a hook wiring */
}
