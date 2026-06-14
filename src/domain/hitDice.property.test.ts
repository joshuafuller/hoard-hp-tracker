import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { HpState } from "./hp";
import {
  type HitDiceState,
  restoreHitDice,
  setConMod,
  setHitDiceAvailable,
  setHitDiceTotal,
  spendHitDie,
} from "./hitDice";

const hd: fc.Arbitrary<HitDiceState> = fc
  .record({
    hitDieSize: fc.constantFrom(6, 8, 10, 12) as fc.Arbitrary<6 | 8 | 10 | 12>,
    hitDiceTotal: fc.integer({ min: 0, max: 20 }),
    conMod: fc.integer({ min: -5, max: 10 }),
  })
  .chain((h) =>
    fc.integer({ min: 0, max: h.hitDiceTotal }).map((hitDiceAvailable) => ({
      ...h,
      hitDiceAvailable,
    })),
  );

const combined: fc.Arbitrary<HpState & HitDiceState> = hd.chain((h) =>
  fc
    .record({ max: fc.integer({ min: 1, max: 200 }), temp: fc.integer({ min: 0, max: 50 }) })
    .chain(({ max, temp }) =>
      fc.integer({ min: 0, max }).map((current) => ({ ...h, current, max, temp })),
    ),
);

const anyInt = fc.integer({ min: -10, max: 30 });
const validHd = (s: HitDiceState) =>
  s.hitDiceTotal >= 0 && s.hitDiceAvailable >= 0 && s.hitDiceAvailable <= s.hitDiceTotal;

describe("hitDice domain — properties", () => {
  it("setters keep total >= 0 and 0 <= available <= total", () => {
    fc.assert(
      fc.property(hd, anyInt, (s, n) => {
        expect(validHd(setHitDiceTotal(s, n))).toBe(true);
        expect(validHd(setHitDiceAvailable(s, n))).toBe(true);
        expect(setConMod(s, n).conMod).toBe(n);
      }),
    );
  });

  it("restoreHitDice caps at total, never goes negative, ignores negative n", () => {
    fc.assert(
      fc.property(hd, anyInt, (s, n) => {
        const r = restoreHitDice(s, n);
        expect(validHd(r)).toBe(true);
        expect(r.hitDiceAvailable).toBe(Math.min(s.hitDiceTotal, s.hitDiceAvailable + Math.max(0, n)));
      }),
    );
  });

  it("spendHitDie is a no-op with no dice, else spends exactly one and heals roll+CON", () => {
    fc.assert(
      fc.property(combined, fc.integer({ min: -2, max: 20 }), (s, roll) => {
        const r = spendHitDie(s, roll);
        if (s.hitDiceAvailable <= 0) {
          expect(r).toBe(s); // same reference, true no-op
        } else {
          expect(r.hitDiceAvailable).toBe(s.hitDiceAvailable - 1);
          const expected = Math.min(s.max, s.current + Math.max(0, roll + s.conMod));
          expect(r.current).toBe(expected);
          expect(r.current).toBeGreaterThanOrEqual(s.current); // heal never reduces HP
          expect(r.current).toBeLessThanOrEqual(s.max);
        }
      }),
    );
  });
});
