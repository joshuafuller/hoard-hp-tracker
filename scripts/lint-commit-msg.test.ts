import { describe, expect, it } from "vitest";
import { validateCommitMessage } from "./lint-commit-msg.mjs";

describe("validateCommitMessage (Conventional Commits / release-please)", () => {
  it("accepts the conventional types release-please understands", () => {
    for (const t of ["feat", "fix", "perf", "refactor", "revert", "docs", "chore", "test", "ci", "build", "style"]) {
      expect(validateCommitMessage(`${t}: do a thing`).valid, t).toBe(true);
    }
  });

  it("accepts an optional scope and a breaking-change '!'", () => {
    expect(validateCommitMessage("fix(hp): bound the editor column").valid).toBe(true);
    expect(validateCommitMessage("feat(release)!: drop the legacy path").valid).toBe(true);
    expect(validateCommitMessage("feat(dice-tray): add d100").valid).toBe(true);
  });

  it("accepts a body after the header (validates only the header line)", () => {
    expect(validateCommitMessage("feat: add thing\n\nLonger body explaining why.\n\nCloses #1").valid).toBe(true);
  });

  it("rejects a missing type prefix", () => {
    expect(validateCommitMessage("added a thing").valid).toBe(false);
    expect(validateCommitMessage("update the readme").valid).toBe(false);
  });

  it("rejects an unknown type and an uppercase type", () => {
    expect(validateCommitMessage("update: x").valid).toBe(false);
    expect(validateCommitMessage("Feat: x").valid).toBe(false);
    expect(validateCommitMessage("FIX: x").valid).toBe(false);
  });

  it("rejects a missing colon or empty description", () => {
    expect(validateCommitMessage("feat add thing").valid).toBe(false);
    expect(validateCommitMessage("feat:").valid).toBe(false);
    expect(validateCommitMessage("feat:   ").valid).toBe(false);
  });

  it("rejects an over-long header (> 100 chars)", () => {
    expect(validateCommitMessage(`feat: ${"x".repeat(100)}`).valid).toBe(false);
  });

  it("allows git-generated merge / revert / fixup commits through (not manual conventional commits)", () => {
    expect(validateCommitMessage("Merge pull request #211 from joshuafuller/fix/x").valid).toBe(true);
    expect(validateCommitMessage("Merge branch 'main' into feature").valid).toBe(true);
    expect(validateCommitMessage('Revert "feat: add thing"').valid).toBe(true);
    expect(validateCommitMessage("fixup! feat: add thing").valid).toBe(true);
    expect(validateCommitMessage("squash! feat: add thing").valid).toBe(true);
  });

  it("ignores comment lines and blank leading lines (git strips comments)", () => {
    expect(validateCommitMessage("# a comment\nfeat: real header").valid).toBe(true);
  });

  it("returns a helpful error message on failure", () => {
    const r = validateCommitMessage("nope");
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/conventional/i);
  });
});
