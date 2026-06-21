import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { rollHeadless } from "./diceEngine";

// rollHeadless is the no-physics path (reduced-motion / engine-unavailable): it
// rolls entirely in the parser. Deterministic when given floats (= (value-1)/sides),
// real Math.random otherwise. The animated dice-box path is covered by e2e (WebGL).
describe("rollHeadless", () => {
  it("rolls a plain d20 + modifier deterministically from injected floats", () => {
    const rec = rollHeadless("1d20+5", [(18 - 1) / 20]);
    expect(rec.total).toBe(23);
    expect(rec.result).toEqual([18]);
    expect(rec.dice).toEqual([{ sides: 20, value: 18, dropped: false }]);
  });

  it("advantage keeps the high die, marks the low one dropped", () => {
    const rec = rollHeadless("2d20kh1", [(18 - 1) / 20, (4 - 1) / 20]);
    expect(rec.total).toBe(18);
    expect(rec.result).toEqual([18]);
    expect(rec.dice.filter((d) => d.dropped).map((d) => d.value)).toEqual([4]);
  });

  it("disadvantage keeps the low die", () => {
    const rec = rollHeadless("2d20kl1", [(18 - 1) / 20, (4 - 1) / 20]);
    expect(rec.total).toBe(4);
    expect(rec.result).toEqual([4]);
  });

  it("with no injected floats, produces a valid in-range roll via real RNG", () => {
    for (let i = 0; i < 50; i++) {
      const rec = rollHeadless("1d20");
      expect(rec.dice).toHaveLength(1);
      expect(rec.dice[0]!.sides).toBe(20);
      expect(rec.total).toBeGreaterThanOrEqual(1);
      expect(rec.total).toBeLessThanOrEqual(20);
      expect(rec.result).toEqual([rec.total]);
    }
  });

  it("exploding rolls never tally the total ahead of the dice (total == sum, in range)", () => {
    for (let i = 0; i < 200; i++) {
      const rec = rollHeadless("3d6!");
      const sum = rec.dice.filter((d) => !d.dropped).reduce((a, d) => a + d.value, 0);
      expect(rec.total).toBe(sum); // the total always matches the dice actually shown
      for (const d of rec.dice) {
        expect(d.value).toBeGreaterThanOrEqual(1);
        expect(d.value).toBeLessThanOrEqual(6);
      }
    }
  });

  it("property: every die size stays within [1, sides] (guards the round-overshoot bug)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 6, 8, 10, 12, 20, 100),
        fc.integer({ min: 1, max: 6 }),
        (sides, count) => {
          const rec = rollHeadless(`${count}d${sides}`);
          expect(rec.dice).toHaveLength(count);
          for (const d of rec.dice) {
            expect(d.sides).toBe(sides);
            expect(d.value).toBeGreaterThanOrEqual(1);
            expect(d.value).toBeLessThanOrEqual(sides);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
