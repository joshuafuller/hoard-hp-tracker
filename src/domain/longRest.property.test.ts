import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { longRest, type RestState } from "./longRest";

const pip = fc.integer({ min: 0, max: 3 });

const base = fc
  .record({
    max: fc.integer({ min: 1, max: 200 }),
    temp: fc.integer({ min: 0, max: 50 }),
    successes: pip,
    failures: pip,
    label: fc.string(), // an arbitrary unrelated field that must ride along untouched
  })
  .chain((b) => fc.integer({ min: 0, max: b.max }).map((current) => ({ ...b, current })));

/** A rest state WITH Hit Dice tracked. */
const withHd: fc.Arbitrary<RestState> = base.chain((b) =>
  fc
    .integer({ min: 0, max: 20 })
    .chain((hitDiceTotal) =>
      fc
        .integer({ min: 0, max: hitDiceTotal })
        .map((hitDiceAvailable): RestState => ({ ...b, hitDiceTotal, hitDiceAvailable })),
    ),
);

/** A rest state WITHOUT Hit Dice fields. */
const withoutHd: fc.Arbitrary<RestState> = base.map((b): RestState => ({ ...b }));

const recovered = (r: RestState, src: RestState) => {
  expect(r.current).toBe(src.max);
  expect(r.temp).toBe(0);
  expect(r.successes).toBe(0);
  expect(r.failures).toBe(0);
  expect(r.label).toBe(src.label); // unrelated field preserved
};

describe("longRest domain — properties", () => {
  it("always restores HP/temp/death-saves and preserves unrelated fields", () => {
    fc.assert(
      fc.property(withHd, (s) => recovered(longRest(s), s)),
    );
  });

  it("with Hit Dice: regains half the pool (min 1), capped at the total", () => {
    fc.assert(
      fc.property(withHd, (s) => {
        const r = longRest(s);
        const total = s.hitDiceTotal as number;
        const avail = s.hitDiceAvailable as number;
        expect(r.hitDiceAvailable).toBe(Math.min(total, avail + Math.max(1, Math.floor(total / 2))));
        expect(r.hitDiceAvailable as number).toBeLessThanOrEqual(total);
        expect(r.hitDiceAvailable as number).toBeGreaterThanOrEqual(avail);
      }),
    );
  });

  it("without Hit Dice: recovers HP only and never invents Hit Dice fields", () => {
    fc.assert(
      fc.property(withoutHd, (s) => {
        const r = longRest(s);
        recovered(r, s);
        expect("hitDiceTotal" in r).toBe(false);
        expect("hitDiceAvailable" in r).toBe(false);
      }),
    );
  });

  // Deterministic edge: a state with only ONE of the two Hit Dice fields is
  // treated as untracked (both must be numbers). Pins the && (not ||) guard.
  it("treats a half-specified Hit Dice state as untracked", () => {
    const onlyTotal = longRest({
      current: 0, max: 20, temp: 0, successes: 0, failures: 0, hitDiceTotal: 5,
    });
    expect("hitDiceAvailable" in onlyTotal).toBe(false);

    const onlyAvailable = longRest({
      current: 0, max: 20, temp: 0, successes: 0, failures: 0, hitDiceAvailable: 2,
    });
    expect(onlyAvailable.hitDiceAvailable).toBe(2); // untouched, not recomputed to NaN
  });

  it("never mutates its input", () => {
    fc.assert(
      fc.property(withHd, (s) => {
        const snap = JSON.stringify(s);
        longRest(Object.freeze({ ...s }));
        expect(JSON.stringify(s)).toBe(snap);
      }),
    );
  });
});
