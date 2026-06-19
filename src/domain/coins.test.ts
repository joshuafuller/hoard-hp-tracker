import { describe, expect, it } from "vitest";
import { addCoin, type Coins, setCoin, spendCoin, totalCp, totalGp } from "./coins";

const C = (pp: number, gp: number, sp: number, cp: number): Coins => ({ pp, gp, sp, cp });

describe("coins", () => {
  it("adds to a denomination, leaving others untouched", () => {
    expect(addCoin(C(0, 5, 0, 0), "gp", 7)).toEqual(C(0, 12, 0, 0));
    expect(addCoin(C(0, 0, 3, 0), "sp", 2)).toEqual(C(0, 0, 5, 0));
    expect(addCoin(C(1, 0, 0, 0), "pp", 4)).toEqual(C(5, 0, 0, 0));
  });

  it("sets a denomination to an exact non-negative integer", () => {
    expect(setCoin(C(0, 1, 2, 3), "sp", 9)).toEqual(C(0, 1, 9, 3));
    expect(setCoin(C(0, 1, 2, 3), "cp", -5)).toEqual(C(0, 1, 2, 0));
    expect(setCoin(C(0, 1, 2, 3), "gp", 4.7)).toEqual(C(0, 4, 2, 3));
  });

  it("computes the total in gold (1pp=10gp, 10sp=1gp, 100cp=1gp)", () => {
    expect(totalGp(C(0, 41, 12, 30))).toBeCloseTo(41 + 1.2 + 0.3, 5); // 42.5
    expect(totalGp(C(2, 0, 0, 0))).toBe(20);
    expect(totalGp(C(0, 0, 0, 0))).toBe(0);
  });

  describe("spend (with cross-denomination conversion)", () => {
    it("spends directly when the denomination has enough", () => {
      expect(spendCoin(C(0, 10, 0, 0), "gp", 4)).toEqual(C(0, 6, 0, 0));
    });

    it("breaks a higher coin into change when the denomination runs short", () => {
      // 1 gp, spend 1 sp → break the gp into 10 sp, spend 1, leaves 9 sp.
      expect(spendCoin(C(0, 1, 0, 0), "sp", 1)).toEqual(C(0, 0, 9, 0));
      // 1 gp, spend 1 cp → 99 cp change comes back as cp.
      expect(spendCoin(C(0, 1, 0, 0), "cp", 1)).toEqual(C(0, 0, 0, 99));
      // 1 pp, spend 1 gp → 9 gp change.
      expect(spendCoin(C(1, 0, 0, 0), "gp", 1)).toEqual(C(0, 9, 0, 0));
    });

    it("breaks the smallest sufficient higher coin first", () => {
      // Holding 1 pp and 1 gp, spending 1 sp breaks the gp, not the pp.
      expect(spendCoin(C(1, 1, 0, 0), "sp", 1)).toEqual(C(1, 0, 9, 0));
    });

    it("combines lower coins to cover a shortfall in a higher denomination", () => {
      // No gp, but 15 sp → spending 1 gp consumes 10 sp.
      expect(spendCoin(C(0, 0, 15, 0), "gp", 1)).toEqual(C(0, 0, 5, 0));
      // 2 gp + 50 sp, spend 3 gp → take both gp, then 10 sp for the last gp.
      expect(spendCoin(C(0, 2, 50, 0), "gp", 3)).toEqual(C(0, 0, 40, 0));
    });

    it("conserves total wealth across a converting spend", () => {
      const before = C(1, 3, 7, 4); // 1374 cp
      const after = spendCoin(before, "sp", 5); // remove 50 cp
      expect(totalCp(after)).toBe(totalCp(before) - 50);
    });

    it("leaves the purse unchanged when funds are insufficient (never negative)", () => {
      expect(spendCoin(C(0, 3, 0, 0), "gp", 10)).toEqual(C(0, 3, 0, 0));
      expect(spendCoin(C(0, 0, 0, 0), "cp", 1)).toEqual(C(0, 0, 0, 0));
    });

    it("ignores non-positive spends", () => {
      expect(spendCoin(C(0, 1, 1, 1), "gp", 0)).toEqual(C(0, 1, 1, 1));
      expect(spendCoin(C(0, 1, 1, 1), "gp", -3)).toEqual(C(0, 1, 1, 1));
    });
  });

  it("is pure — does not mutate its input", () => {
    const c = C(1, 1, 1, 1);
    addCoin(c, "gp", 5);
    spendCoin(c, "sp", 1);
    setCoin(c, "cp", 9);
    expect(c).toEqual(C(1, 1, 1, 1));
  });
});
