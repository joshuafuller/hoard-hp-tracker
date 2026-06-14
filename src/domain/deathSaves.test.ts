import { describe, expect, it } from "vitest";
import {
  addFailure,
  addSuccess,
  applyDeathRoll,
  type DeathSaves,
  EMPTY_DEATH_SAVES,
  reconcile,
  reset,
  setFailures,
  setSuccesses,
  statusFor,
} from "./deathSaves";

const ds = (successes: number, failures: number): DeathSaves => ({
  successes,
  failures,
});

describe("death-save counters", () => {
  it("EMPTY_DEATH_SAVES and reset() are 0/0", () => {
    expect(EMPTY_DEATH_SAVES).toEqual({ successes: 0, failures: 0 });
    expect(reset()).toEqual({ successes: 0, failures: 0 });
  });

  it("setSuccesses / setFailures clamp to 0..3", () => {
    expect(setSuccesses(ds(0, 0), 2)).toEqual(ds(2, 0));
    expect(setSuccesses(ds(0, 0), 9)).toEqual(ds(3, 0));
    expect(setSuccesses(ds(0, 0), -1)).toEqual(ds(0, 0));
    expect(setFailures(ds(0, 1), 3)).toEqual(ds(0, 3));
    expect(setFailures(ds(0, 0), -5)).toEqual(ds(0, 0));
  });

  it("addSuccess / addFailure increment and clamp", () => {
    expect(addSuccess(ds(1, 0))).toEqual(ds(2, 0));
    expect(addSuccess(ds(3, 0))).toEqual(ds(3, 0));
    expect(addFailure(ds(0, 1))).toEqual(ds(0, 2));
    expect(addFailure(ds(0, 1), 2)).toEqual(ds(0, 3));
    expect(addFailure(ds(0, 2), 2)).toEqual(ds(0, 3));
  });

  it("does not mutate its input (purity)", () => {
    const input = ds(1, 1);
    addSuccess(input);
    setFailures(input, 3);
    expect(input).toEqual(ds(1, 1));
  });
});

describe("statusFor", () => {
  it("is alive above 0 HP regardless of pips", () => {
    expect(statusFor(5, ds(0, 0))).toBe("alive");
    expect(statusFor(1, ds(2, 2))).toBe("alive");
  });

  it("is dying at 0 HP with room left on both tracks", () => {
    expect(statusFor(0, ds(0, 0))).toBe("dying");
    expect(statusFor(0, ds(2, 2))).toBe("dying");
  });

  it("is stable at 3 successes", () => {
    expect(statusFor(0, ds(3, 0))).toBe("stable");
  });

  it("is dead at 3 failures (failure wins ties)", () => {
    expect(statusFor(0, ds(0, 3))).toBe("dead");
    expect(statusFor(0, ds(3, 3))).toBe("dead");
  });
});

describe("applyDeathRoll", () => {
  const state = (current: number, s: number, f: number) => ({
    current,
    deathSaves: ds(s, f),
  });

  it("nat 20 revives at 1 HP and clears the saves", () => {
    expect(applyDeathRoll(state(0, 1, 2), 20)).toEqual(state(1, 0, 0));
  });

  it("nat 1 adds two failures", () => {
    expect(applyDeathRoll(state(0, 0, 0), 1)).toEqual(state(0, 0, 2));
    expect(applyDeathRoll(state(0, 0, 2), 1)).toEqual(state(0, 0, 3));
  });

  it("10+ is a success", () => {
    expect(applyDeathRoll(state(0, 0, 0), 10)).toEqual(state(0, 1, 0));
    expect(applyDeathRoll(state(0, 1, 0), 19)).toEqual(state(0, 2, 0));
  });

  it("2..9 is a failure", () => {
    expect(applyDeathRoll(state(0, 0, 0), 9)).toEqual(state(0, 0, 1));
    expect(applyDeathRoll(state(0, 0, 0), 2)).toEqual(state(0, 0, 1));
  });

  it("clamps and truncates out-of-range / fractional rolls to 1..20", () => {
    // 0 and negatives -> nat 1 (two failures)
    expect(applyDeathRoll(state(0, 0, 0), 0)).toEqual(state(0, 0, 2));
    expect(applyDeathRoll(state(0, 0, 0), -3)).toEqual(state(0, 0, 2));
    // above 20 -> nat 20 (revive)
    expect(applyDeathRoll(state(0, 1, 2), 25)).toEqual(state(1, 0, 0));
    // fractional -> truncated: 1.9 -> 1 (nat 1); 10.9 -> 10 (success)
    expect(applyDeathRoll(state(0, 0, 0), 1.9)).toEqual(state(0, 0, 2));
    expect(applyDeathRoll(state(0, 0, 0), 10.9)).toEqual(state(0, 1, 0));
  });
});

describe("reconcile", () => {
  it("clears saves whenever current is above 0", () => {
    expect(reconcile(7, ds(2, 1))).toEqual(EMPTY_DEATH_SAVES);
  });

  it("leaves saves intact at 0 HP", () => {
    expect(reconcile(0, ds(2, 1))).toEqual(ds(2, 1));
  });
});
