import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { damage, heal, type HpState, setCurrent, setMax, setTemp } from "./hp";

/** A valid HP state: max >= 1, 0 <= current <= max, temp >= 0. */
const validHp: fc.Arbitrary<HpState> = fc
  .record({ max: fc.integer({ min: 1, max: 500 }), temp: fc.integer({ min: 0, max: 100 }) })
  .chain(({ max, temp }) =>
    fc.integer({ min: 0, max }).map((current) => ({ current, max, temp })),
  );

const amount = fc.integer({ min: 0, max: 1000 });
const anyInt = fc.integer({ min: -1000, max: 1000 });

const invariants = (s: HpState) =>
  s.max >= 1 && s.current >= 0 && s.current <= s.max && s.temp >= 0;

const frozen = (s: HpState): HpState =>
  Object.freeze({ ...s }) as HpState;

describe("hp domain — properties", () => {
  it("every operation preserves the invariants", () => {
    fc.assert(
      fc.property(validHp, anyInt, (s, n) => {
        for (const op of [damage, heal, setTemp, setMax, setCurrent]) {
          expect(invariants(op(frozen(s), n))).toBe(true);
        }
      }),
    );
  });

  it("damage conserves the pool: it removes min(n, current+temp) total HP", () => {
    fc.assert(
      fc.property(validHp, amount, (s, n) => {
        const before = s.current + s.temp;
        const after = (() => {
          const r = damage(s, n);
          return r.current + r.temp;
        })();
        expect(before - after).toBe(Math.min(n, before));
      }),
    );
  });

  it("damage spends temporary HP before current HP", () => {
    fc.assert(
      fc.property(validHp, amount, (s, n) => {
        const r = damage(s, n);
        // Current only drops once temp is exhausted.
        if (n <= s.temp) expect(r.current).toBe(s.current);
        else expect(r.temp).toBe(0);
      }),
    );
  });

  it("heal never exceeds max, never lowers current, never restores temp", () => {
    fc.assert(
      fc.property(validHp, amount, (s, n) => {
        const r = heal(s, n);
        expect(r.current).toBeGreaterThanOrEqual(s.current);
        expect(r.current).toBeLessThanOrEqual(s.max);
        expect(r.temp).toBe(s.temp);
      }),
    );
  });

  it("setCurrent clamps into [0, max]; setTemp floors at 0", () => {
    fc.assert(
      fc.property(validHp, anyInt, (s, n) => {
        const c = setCurrent(s, n);
        expect(c.current).toBe(Math.max(0, Math.min(s.max, n)));
        expect(setTemp(s, n).temp).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("lowering max clamps current down; raising it never changes current", () => {
    fc.assert(
      fc.property(validHp, fc.integer({ min: 1, max: 500 }), (s, m) => {
        const r = setMax(s, m);
        expect(r.max).toBe(m);
        expect(r.current).toBe(Math.min(s.current, m));
      }),
    );
  });

  it("a non-positive damage/heal is a no-op returning the same reference", () => {
    const s: HpState = { current: 7, max: 10, temp: 3 };
    expect(damage(s, 0)).toBe(s);
    expect(damage(s, -5)).toBe(s);
    expect(heal(s, 0)).toBe(s);
    expect(heal(s, -9)).toBe(s);
  });

  it("never mutates its input (operations are pure)", () => {
    fc.assert(
      fc.property(validHp, anyInt, (s, n) => {
        const snapshot = { ...s };
        for (const op of [damage, heal, setTemp, setMax, setCurrent]) op(frozen(s), n);
        expect(s).toEqual(snapshot);
      }),
    );
  });
});
