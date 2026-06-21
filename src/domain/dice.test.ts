import { describe, expect, it } from "vitest";
import fc from "fast-check";
// @ts-expect-error — the parser ships no types
import DiceParser from "@3d-dice/dice-parser-interface";
import {
  addToPool,
  advantageApplies,
  buildNotation,
  poolToNotation,
  removeFromPool,
  toRollRecord,
  type DiceSelection,
  type DiePool,
} from "./dice";

const sel = (over: Partial<DiceSelection> = {}): DiceSelection => ({
  count: 1,
  sides: 20,
  modifier: 0,
  mode: "normal",
  ...over,
});

describe("buildNotation", () => {
  it("builds a plain single die with no modifier", () => {
    expect(buildNotation(sel())).toBe("1d20");
  });

  it("appends a positive modifier with a + sign", () => {
    expect(buildNotation(sel({ modifier: 5 }))).toBe("1d20+5");
  });

  it("appends a negative modifier with its own minus sign", () => {
    expect(buildNotation(sel({ modifier: -1 }))).toBe("1d20-1");
  });

  it("omits a zero modifier", () => {
    expect(buildNotation(sel({ count: 2, sides: 6, modifier: 0 }))).toBe("2d6");
  });

  it("builds multi-die damage with a modifier", () => {
    expect(buildNotation(sel({ count: 2, sides: 6, modifier: 3 }))).toBe("2d6+3");
  });

  it("advantage forces two d20 keep-highest, ignoring count", () => {
    expect(buildNotation(sel({ count: 1, mode: "advantage" }))).toBe("2d20kh1");
    expect(buildNotation(sel({ count: 4, mode: "advantage" }))).toBe("2d20kh1");
  });

  it("disadvantage forces two d20 keep-lowest", () => {
    expect(buildNotation(sel({ mode: "disadvantage" }))).toBe("2d20kl1");
  });

  it("keeps the modifier on adv/dis, after the keep clause", () => {
    expect(buildNotation(sel({ mode: "advantage", modifier: 5 }))).toBe("2d20kh1+5");
    expect(buildNotation(sel({ mode: "disadvantage", modifier: -2 }))).toBe("2d20kl1-2");
  });

  it("clamps count to at least one and truncates fractional inputs", () => {
    expect(buildNotation(sel({ count: 0 }))).toBe("1d20");
    expect(buildNotation(sel({ count: 2.9, sides: 6 }))).toBe("2d6");
    expect(buildNotation(sel({ modifier: 3.7 }))).toBe("1d20+3");
  });

  it("property: a normal roll always parses back to its count/sides/mod", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        fc.constantFrom(4, 6, 8, 10, 12, 20, 100),
        fc.integer({ min: -20, max: 20 }),
        (count, sides, modifier) => {
          const n = buildNotation(sel({ count, sides, modifier, mode: "normal" }));
          const m = n.match(/^(\d+)d(\d+)([+-]\d+)?$/);
          expect(m).not.toBeNull();
          expect(Number(m![1])).toBe(count);
          expect(Number(m![2])).toBe(sides);
          expect(Number(m![3] ?? 0)).toBe(modifier);
        },
      ),
    );
  });
});

// toRollRecord is tested against the REAL parser (it runs under vitest, no WebGL).
// We make it deterministic by injecting `rollsAsFloats` (float = (value-1)/sides),
// exactly how dice-box values feed the parser — so these test the real contract.
describe("dice pool builder", () => {
  it("adds dice, accumulating count and preserving tap order", () => {
    let pool: DiePool = [];
    pool = addToPool(pool, 20);
    pool = addToPool(pool, 20);
    pool = addToPool(pool, 6);
    expect(pool).toEqual([
      { sides: 20, count: 2 },
      { sides: 6, count: 1 },
    ]);
  });

  it("removes (decrements) a die and drops the group at zero", () => {
    let pool: DiePool = [
      { sides: 6, count: 2 },
      { sides: 4, count: 1 },
    ];
    pool = removeFromPool(pool, 4); // drops the d4 group
    expect(pool).toEqual([{ sides: 6, count: 2 }]);
    pool = removeFromPool(pool, 6); // 2 → 1
    expect(pool).toEqual([{ sides: 6, count: 1 }]);
    pool = removeFromPool(pool, 99); // absent → no-op
    expect(pool).toEqual([{ sides: 6, count: 1 }]);
  });

  it("knows advantage applies only to a lone d20", () => {
    expect(advantageApplies([{ sides: 20, count: 1 }])).toBe(true);
    expect(advantageApplies([{ sides: 20, count: 2 }])).toBe(false);
    expect(advantageApplies([{ sides: 6, count: 1 }])).toBe(false);
    expect(advantageApplies([])).toBe(false);
    expect(advantageApplies([{ sides: 20, count: 1 }, { sides: 6, count: 1 }])).toBe(false);
  });

  it("builds notation from the pool + modifier", () => {
    expect(poolToNotation([], 0, "normal")).toBe("");
    expect(poolToNotation([{ sides: 20, count: 1 }], 5, "normal")).toBe("1d20+5");
    expect(poolToNotation([{ sides: 6, count: 2 }, { sides: 4, count: 1 }], 3, "normal")).toBe("2d6+1d4+3");
    expect(poolToNotation([{ sides: 6, count: 2 }], -1, "normal")).toBe("2d6-1");
  });

  it("applies advantage/disadvantage only for a lone d20", () => {
    expect(poolToNotation([{ sides: 20, count: 1 }], 5, "advantage")).toBe("2d20kh1+5");
    expect(poolToNotation([{ sides: 20, count: 1 }], 0, "disadvantage")).toBe("2d20kl1");
    // not a lone d20 → mode ignored
    expect(poolToNotation([{ sides: 20, count: 2 }], 0, "advantage")).toBe("2d20");
    expect(poolToNotation([{ sides: 6, count: 3 }], 0, "advantage")).toBe("3d6");
  });
});

describe("toRollRecord (real parser)", () => {
  const roll = (notation: string, values: Array<{ v: number; sides: number }>) => {
    const p = new DiceParser();
    p.parseNotation(notation);
    p.rollsAsFloats = values.map(({ v, sides }) => (v - 1) / sides);
    const result = p.rollNotation(p.parsedNotation);
    return toRollRecord(result, notation);
  };

  it("records a simple 1d20+5 as total, kept result, and the die", () => {
    const rec = roll("1d20+5", [{ v: 18, sides: 20 }]);
    expect(rec.notation).toBe("1d20+5");
    expect(rec.total).toBe(23);
    expect(rec.result).toEqual([18]);
    expect(rec.dice).toEqual([{ sides: 20, value: 18, dropped: false }]);
  });

  it("marks the dropped low die on advantage and keeps only the high one", () => {
    const rec = roll("2d20kh1", [{ v: 18, sides: 20 }, { v: 4, sides: 20 }]);
    expect(rec.total).toBe(18);
    expect(rec.result).toEqual([18]);
    expect(rec.dice).toHaveLength(2);
    const kept = rec.dice.find((d) => !d.dropped);
    const dropped = rec.dice.find((d) => d.dropped);
    expect(kept).toEqual({ sides: 20, value: 18, dropped: false });
    expect(dropped).toEqual({ sides: 20, value: 4, dropped: true });
  });

  it("disadvantage keeps the low die", () => {
    const rec = roll("2d20kl1", [{ v: 18, sides: 20 }, { v: 4, sides: 20 }]);
    expect(rec.total).toBe(4);
    expect(rec.result).toEqual([4]);
  });

  it("sums multiple dice groups plus a modifier and records every die", () => {
    const rec = roll("2d6+1d4+3", [
      { v: 4, sides: 6 },
      { v: 6, sides: 6 },
      { v: 2, sides: 4 },
    ]);
    expect(rec.total).toBe(15);
    expect(rec.result).toEqual([4, 6, 2]);
    expect(rec.dice).toEqual([
      { sides: 6, value: 4, dropped: false },
      { sides: 6, value: 6, dropped: false },
      { sides: 4, value: 2, dropped: false },
    ]);
  });

  it("4d6 drop-lowest keeps three, struck-out one", () => {
    const rec = roll("4d6kh3", [
      { v: 6, sides: 6 },
      { v: 5, sides: 6 },
      { v: 4, sides: 6 },
      { v: 2, sides: 6 },
    ]);
    expect(rec.total).toBe(15);
    expect(rec.result.sort((a, b) => a - b)).toEqual([4, 5, 6]);
    expect(rec.dice.filter((d) => d.dropped)).toEqual([{ sides: 6, value: 2, dropped: true }]);
  });
});
