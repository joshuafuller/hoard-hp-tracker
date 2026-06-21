import { describe, expect, it } from "vitest";
import fc from "fast-check";
// @ts-expect-error — the parser ships no types
import DiceParser from "@3d-dice/dice-parser-interface";
import {
  addToPool,
  advantageApplies,
  buildNotation,
  isPlausibleRoll,
  notationHasDice,
  notationModifier,
  poolToNotation,
  recordFromPhysical,
  removeFromPool,
  toRollRecord,
  type DiceSelection,
  type DiePool,
  type RollRecord,
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

describe("isPlausibleRoll (engine result guard)", () => {
  const rec = (over: Partial<RollRecord> = {}): RollRecord => ({
    notation: "1d20",
    total: 14,
    result: [14],
    dice: [{ sides: 20, value: 14, dropped: false }],
    ...over,
  });

  it("accepts a normal roll", () => {
    expect(isPlausibleRoll(rec(), "1d20")).toBe(true);
  });

  it("rejects the malformed engine result: a total with NO dice for a dice notation", () => {
    // the observed bug: a re-rolled 1d20 came back as total 21 with zero dice.
    expect(isPlausibleRoll(rec({ total: 21, result: [], dice: [] }), "1d20")).toBe(false);
  });

  it("rejects a non-finite total", () => {
    expect(isPlausibleRoll(rec({ total: NaN }), "1d20")).toBe(false);
  });

  it("allows an empty dice set for a bare modifier (no dice in the notation)", () => {
    expect(isPlausibleRoll({ notation: "+5", total: 5, result: [], dice: [] }, "+5")).toBe(true);
  });

  it("notationHasDice detects dice vs bare modifiers", () => {
    for (const n of ["1d20", "2d6+3", "4d6kh3", "3d6!", "1dF", "1d%"]) expect(notationHasDice(n)).toBe(true);
    for (const n of ["+5", "5", "-2", ""]) expect(notationHasDice(n)).toBe(false);
  });
});

describe("notationModifier", () => {
  it("sums standalone integer terms, ignoring dice terms", () => {
    expect(notationModifier("8d6!")).toBe(0);
    expect(notationModifier("8d6!+3")).toBe(3);
    expect(notationModifier("2d6+1d4")).toBe(0);
    expect(notationModifier("1d20-2")).toBe(-2);
    expect(notationModifier("2d20kh1+5")).toBe(5);
    expect(notationModifier("3d6+2-1")).toBe(1);
  });
});

describe("recordFromPhysical (physics-authoritative record)", () => {
  // dice-box onRollComplete shape: groups carrying a flat `rolls[]` of physical dice.
  const group = (rolls: Array<{ rollId: number | string; sides: number; value: number }>) => [{ rolls }];

  it("builds the record from the physical dice the user sees (captured 8d6! explosion)", () => {
    // From the spike: 8 initial (the 6 is rollId 2) + the explosion rollId "2.1" = 5.
    const results = group([
      { rollId: 0, sides: 6, value: 4 },
      { rollId: 1, sides: 6, value: 3 },
      { rollId: 2, sides: 6, value: 6 },
      { rollId: 3, sides: 6, value: 1 },
      { rollId: 4, sides: 6, value: 5 },
      { rollId: 5, sides: 6, value: 2 },
      { rollId: 6, sides: 6, value: 1 },
      { rollId: 7, sides: 6, value: 5 },
      { rollId: "2.1", sides: 6, value: 5 }, // the explosion — value matches the table
    ]);
    const rec = recordFromPhysical(results, "8d6!");
    expect(rec.dice).toHaveLength(9);
    expect(rec.total).toBe(32); // 4+3+6+1+5+2+1+5 + 5
    // the explosion die carries its physical value AND round 2
    const explosion = rec.dice[8]!;
    expect(explosion.value).toBe(5);
    expect(explosion.round).toBe(2);
    // exactly one round boundary
    expect(rec.dice.filter((d) => d.round === 2)).toHaveLength(1);
    // the triggering 6 is flagged exploded
    expect(rec.dice[2]!.exploded).toBe(true);
    expect(rec.dice[0]!.exploded).toBeUndefined();
  });

  it("groups multi-round chains by rollId (1d6! → 6 → 6 → 3)", () => {
    const results = group([
      { rollId: 0, sides: 6, value: 6 },
      { rollId: "0.1", sides: 6, value: 6 },
      { rollId: "0.2", sides: 6, value: 3 },
    ]);
    const rec = recordFromPhysical(results, "1d6!");
    expect(rec.total).toBe(15);
    expect(rec.dice.map((d) => d.round ?? 1)).toEqual([1, 2, 3]);
  });

  it("handles a plain roll with a modifier (no rounds, no explode flags)", () => {
    const results = group([
      { rollId: 0, sides: 6, value: 4 },
      { rollId: 1, sides: 6, value: 2 },
    ]);
    const rec = recordFromPhysical(results, "2d6+3");
    expect(rec.total).toBe(9);
    expect(rec.dice.every((d) => d.round === undefined)).toBe(true);
    expect(rec.dice.every((d) => d.exploded === undefined)).toBe(true);
    expect(rec.result).toEqual([4, 2]);
  });

  it("orders dice round-1-first even if the engine appends rounds out of order", () => {
    const results = group([
      { rollId: 0, sides: 6, value: 2 },
      { rollId: "0.1", sides: 6, value: 4 }, // round 2 appended amid round 1
      { rollId: 1, sides: 6, value: 6 },
    ]);
    const rec = recordFromPhysical(results, "2d6!");
    // round 1 dice come before round 2 dice
    expect(rec.dice.map((d) => d.round ?? 1)).toEqual([1, 1, 2]);
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

  it("drops a non-finite (NaN) die the engine occasionally returns, and never emits NaN", () => {
    // dice-box can return a die without a value on huge pools → NaN total (seen
    // on 100d20). Hand-built tree: one good die, one NaN; top value is NaN.
    const tree = {
      value: NaN,
      dice: [{ rolls: [{ die: 20, value: 7, valid: true }, { die: 20, value: NaN, valid: true }] }],
    } as unknown as Parameters<typeof toRollRecord>[0];
    const rec = toRollRecord(tree, "2d20");
    expect(rec.dice).toEqual([{ sides: 20, value: 7, dropped: false }]);
    expect(rec.result).toEqual([7]);
    expect(Number.isFinite(rec.total)).toBe(true);
    expect(rec.total).toBe(7);
  });

  it("recovers the modifier when falling back from a NaN total", () => {
    const tree = {
      value: NaN,
      dice: [
        { rolls: [{ die: 20, value: 7, valid: true }, { die: 20, value: NaN, valid: true }] },
        { type: "number", value: 5 },
      ],
    } as unknown as Parameters<typeof toRollRecord>[0];
    const rec = toRollRecord(tree, "2d20+5");
    expect(rec.total).toBe(12); // 7 (finite die) + 5 (modifier)
  });

  it("captures exploding dice with the total = sum, the trigger flagged, and the added die in round 2", () => {
    // 1d6! where the 6 explodes into a 3 → both dice recorded, total 9.
    const rec = roll("1d6!", [{ v: 6, sides: 6 }, { v: 3, sides: 6 }]);
    expect(rec.total).toBe(9);
    expect(rec.result).toEqual([6, 3]);
    expect(rec.dice).toEqual([
      { sides: 6, value: 6, dropped: false, exploded: true }, // round 1 (implicit) — triggered the explosion
      { sides: 6, value: 3, dropped: false, round: 2 }, // the added die, round 2
    ]);
  });

  it("batches explosion ROUNDS by count, not per-die (the parser appends them at the end)", () => {
    // Hand-built 2d6! tree: round 1 = [6(explode), 4]; the explosion adds round 2 = [5].
    const tree = {
      value: 15,
      dice: [
        {
          count: { value: 2 },
          die: { value: 6 },
          rolls: [
            { die: 6, value: 6, explode: true },
            { die: 6, value: 4 },
            { die: 6, value: 5 }, // appended explosion → round 2
          ],
        },
      ],
    } as unknown as Parameters<typeof toRollRecord>[0];
    const rec = toRollRecord(tree, "2d6!");
    expect(rec.dice).toEqual([
      { sides: 6, value: 6, dropped: false, exploded: true }, // round 1
      { sides: 6, value: 4, dropped: false }, // round 1
      { sides: 6, value: 5, dropped: false, round: 2 }, // round 2 (the explosion)
    ]);
    // exactly one round boundary
    expect(rec.dice.filter((d) => d.round === 2)).toHaveLength(1);
    expect(rec.total).toBe(15);
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
