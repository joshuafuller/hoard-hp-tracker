import { describe, expect, it } from "vitest";
import { addCoin, type Coins, setCoin, spendCoin, totalGp } from "./coins";

const C = (gp: number, sp: number, cp: number): Coins => ({ gp, sp, cp });

describe("coins", () => {
  it("adds to a denomination, leaving others untouched", () => {
    expect(addCoin(C(5, 0, 0), "gp", 7)).toEqual(C(12, 0, 0));
    expect(addCoin(C(0, 3, 0), "sp", 2)).toEqual(C(0, 5, 0));
  });

  it("spends, clamping at zero (never negative)", () => {
    expect(spendCoin(C(10, 0, 0), "gp", 4)).toEqual(C(6, 0, 0));
    expect(spendCoin(C(3, 0, 0), "gp", 10)).toEqual(C(0, 0, 0));
  });

  it("sets a denomination to an exact non-negative integer", () => {
    expect(setCoin(C(1, 2, 3), "sp", 9)).toEqual(C(1, 9, 3));
    expect(setCoin(C(1, 2, 3), "cp", -5)).toEqual(C(1, 2, 0));
    expect(setCoin(C(1, 2, 3), "gp", 4.7)).toEqual(C(4, 2, 3));
  });

  it("computes the total in gold (10sp = 1gp, 100cp = 1gp)", () => {
    expect(totalGp(C(41, 12, 30))).toBeCloseTo(41 + 1.2 + 0.3, 5); // 42.5
    expect(totalGp(C(0, 0, 0))).toBe(0);
  });

  it("is pure — does not mutate its input", () => {
    const c = C(1, 1, 1);
    addCoin(c, "gp", 5);
    expect(c).toEqual(C(1, 1, 1));
  });
});
