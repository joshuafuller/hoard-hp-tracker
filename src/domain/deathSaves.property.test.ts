import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addFailure,
  addSuccess,
  applyDeathRoll,
  type DeathSaves,
  EMPTY_DEATH_SAVES,
  reconcile,
  setFailures,
  setSuccesses,
  statusFor,
} from "./deathSaves";

const pip = fc.integer({ min: 0, max: 3 });
const ds: fc.Arbitrary<DeathSaves> = fc.record({ successes: pip, failures: pip });
const anyInt = fc.integer({ min: -10, max: 10 });
const roll = fc.integer({ min: -10, max: 30 });
const STATUSES = new Set(["alive", "dying", "stable", "dead"]);

const inRange = (n: number) => n >= 0 && n <= 3;

describe("deathSaves domain — properties", () => {
  it("pip setters/adders always clamp to 0..3", () => {
    fc.assert(
      fc.property(ds, anyInt, (s, n) => {
        expect(inRange(setSuccesses(s, n).successes)).toBe(true);
        expect(inRange(setFailures(s, n).failures)).toBe(true);
        expect(inRange(addSuccess(s).successes)).toBe(true);
        expect(inRange(addFailure(s, n).failures)).toBe(true);
      }),
    );
  });

  it("statusFor always returns a valid status, with the documented priority", () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 50 }), ds, (current, s) => {
        const st = statusFor(current, s);
        expect(STATUSES.has(st)).toBe(true);
        if (current > 0) expect(st).toBe("alive");
        else if (s.failures >= 3) expect(st).toBe("dead");
        else if (s.successes >= 3) expect(st).toBe("stable");
        else expect(st).toBe("dying");
      }),
    );
  });

  it("applyDeathRoll keeps pips clamped and matches the clamped d20 outcome", () => {
    fc.assert(
      fc.property(ds, roll, (saves, r) => {
        const next = applyDeathRoll({ current: 0, deathSaves: saves }, r);
        expect(inRange(next.deathSaves.successes)).toBe(true);
        expect(inRange(next.deathSaves.failures)).toBe(true);
        const rc = Math.max(1, Math.min(20, Math.trunc(r)));
        if (rc === 20) {
          expect(next).toEqual({ current: 1, deathSaves: EMPTY_DEATH_SAVES });
        } else if (rc === 1) {
          expect(next.deathSaves.failures).toBe(Math.min(3, saves.failures + 2));
        } else if (rc >= 10) {
          expect(next.deathSaves.successes).toBe(Math.min(3, saves.successes + 1));
        } else {
          expect(next.deathSaves.failures).toBe(Math.min(3, saves.failures + 1));
        }
      }),
    );
  });

  it("reconcile clears saves above 0 HP and leaves them at 0 HP", () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 50 }), ds, (current, s) => {
        const r = reconcile(current, s);
        if (current > 0) expect(r).toEqual(EMPTY_DEATH_SAVES);
        else expect(r).toEqual(s);
      }),
    );
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(ds, anyInt, (s, n) => {
        const snap = { ...s };
        setSuccesses(Object.freeze({ ...s }), n);
        addFailure(Object.freeze({ ...s }), n);
        expect(s).toEqual(snap);
      }),
    );
  });
});
