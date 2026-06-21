import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  addToPool,
  buildNotation,
  isPlausibleRoll,
  poolToNotation,
  removeFromPool,
  type DiePool,
  type RollMode,
} from "../../domain/dice";
import { rollHeadless } from "./diceEngine";

// Property / fuzz tests over the testable dice core (the 3D engine itself is WebGL
// and covered by e2e). These hammer the invariants that the real bugs violated:
// NaN totals, over/early explosion tallies, out-of-range values from the parser's
// RNG, and the malformed "total with no dice" engine result.

const DIE = fc.constantFrom(4, 6, 8, 10, 12, 20, 100);
const MODE = fc.constantFrom<RollMode>("normal", "advantage", "disadvantage");

describe("dice — fuzz / properties", () => {
  it("any chip selection rolls a plausible, finite, in-range record", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), DIE, fc.integer({ min: -10, max: 10 }), MODE, (count, sides, modifier, mode) => {
        const notation = buildNotation({ count, sides, modifier, mode });
        const rec = rollHeadless(notation);
        expect(isPlausibleRoll(rec, notation)).toBe(true);
        expect(Number.isFinite(rec.total)).toBe(true);
        expect(rec.dice.length).toBeGreaterThan(0);
        for (const d of rec.dice) {
          expect(d.value).toBeGreaterThanOrEqual(1);
          expect(d.value).toBeLessThanOrEqual(d.sides);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("plain pools never tally the total ahead of/over the dice: total == sum(kept)+mod", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ sides: DIE, count: fc.integer({ min: 1, max: 4 }) }), { minLength: 1, maxLength: 4 }),
        fc.integer({ min: -10, max: 10 }),
        (pool: DiePool, modifier) => {
          const notation = poolToNotation(pool, modifier, "normal");
          const rec = rollHeadless(notation);
          const sum = rec.dice.filter((d) => !d.dropped).reduce((a, d) => a + d.value, 0) + modifier;
          expect(rec.total).toBe(sum);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("advantage/disadvantage on a lone d20 keeps exactly the higher/lower of two", () => {
    fc.assert(
      fc.property(fc.constantFrom<RollMode>("advantage", "disadvantage"), fc.integer({ min: -5, max: 5 }), (mode, modifier) => {
        const notation = poolToNotation([{ sides: 20, count: 1 }], modifier, mode);
        const rec = rollHeadless(notation);
        expect(rec.dice.length).toBe(2);
        expect(rec.result.length).toBe(1);
        const kept = rec.result[0]!;
        const faces = rec.dice.map((d) => d.value);
        expect(kept).toBe(mode === "advantage" ? Math.max(...faces) : Math.min(...faces));
        expect(rec.total).toBe(kept + modifier);
      }),
      { numRuns: 200 },
    );
  });

  it("pool add/remove preserves count and fully empties", () => {
    fc.assert(
      fc.property(fc.array(DIE, { maxLength: 24 }), (taps) => {
        let pool: DiePool = [];
        for (const s of taps) pool = addToPool(pool, s);
        expect(pool.reduce((a, g) => a + g.count, 0)).toBe(taps.length);
        for (const g of pool) expect(g.count).toBeGreaterThanOrEqual(1);
        for (const s of taps) pool = removeFromPool(pool, s);
        expect(pool).toEqual([]);
      }),
      { numRuns: 200 },
    );
  });
});
