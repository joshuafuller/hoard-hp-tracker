import { describe, expect, it } from "vitest";
import { addCoin, canSpend, coinsEqual, type Coins, distill, setCoin, spendCoin, totalCp, totalGp } from "./coins";

const C = (pp: number, gp: number, sp: number, cp: number): Coins => ({ pp, gp, sp, cp });

describe("canSpend", () => {
  it("is true when total wealth covers the spend via conversion, even with zero of that coin", () => {
    expect(canSpend(C(1, 0, 0, 0), "sp")).toBe(true); // 1 pp = 100 sp covers 1 sp
    expect(canSpend(C(0, 0, 0, 100), "gp")).toBe(true); // 100 cp == 1 gp exactly
  });
  it("is false when total wealth can't cover even one of that coin", () => {
    expect(canSpend(C(0, 0, 0, 0), "cp")).toBe(false); // empty purse
    expect(canSpend(C(0, 0, 0, 5), "gp")).toBe(false); // 5 cp < 100 cp (1 gp)
  });
  it("defaults to one coin and respects an explicit amount", () => {
    expect(canSpend(C(0, 0, 2, 0), "sp")).toBe(true); // 20 cp ≥ 10 cp
    expect(canSpend(C(0, 0, 2, 0), "sp", 3)).toBe(false); // 20 cp < 30 cp
  });
});

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

    it("skips a higher coin that can't cover the spend and breaks the next sufficient one, preserving the smaller coin", () => {
      // 1 gp + 1 pp, spend 15 sp (150 cp): the gp (100 cp) alone can't cover it,
      // so break the pp directly and keep the gp — leaving 1 gp + 85 sp, not 95 sp.
      expect(spendCoin(C(1, 1, 0, 0), "sp", 15)).toEqual(C(0, 1, 85, 0));
    });

    it("breaks a higher coin worth exactly the spend, with no change", () => {
      // 1 gp + 1 pp, spend 10 sp (=100 cp = exactly 1 gp): break the gp for zero
      // change rather than the pp — leaving just the pp.
      expect(spendCoin(C(1, 1, 0, 0), "sp", 10)).toEqual(C(1, 0, 0, 0));
    });

    it("chips the largest coins only when no single higher coin is enough", () => {
      // 3 pp, spend 250 sp (2500 cp): no single pp covers it, so break pp one at a
      // time until 500 cp remains, then break the last pp for 50 sp change.
      expect(spendCoin(C(3, 0, 0, 0), "sp", 250)).toEqual(C(0, 0, 50, 0));
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

    it("spends the ENTIRE purse exactly, emptying it (#265 — exact-funds boundary)", () => {
      // totalCp(c) === want * CP_VALUE[kind] must SUCCEED, not be rejected as "insufficient"
      // (a `<=` guard would wrongly reject spending your whole purse).
      expect(spendCoin(C(0, 1, 0, 0), "sp", 10)).toEqual(C(0, 0, 0, 0)); // 1 gp == 10 sp
      expect(spendCoin(C(1, 0, 0, 0), "gp", 10)).toEqual(C(0, 0, 0, 0)); // 1 pp == 10 gp
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

  describe("distill (collapse into the fewest coins)", () => {
    it("rolls copper up into the proper denominations", () => {
      // 123 cp ⇒ 1 gp, 2 sp, 3 cp (the canonical example).
      expect(distill(C(0, 0, 0, 123))).toEqual(C(0, 1, 2, 3));
    });

    it("maximizes the highest denomination (uses platinum)", () => {
      // 2pp 41gp 12sp 30cp = 6250 cp ⇒ 6pp 2gp 5sp 0cp.
      expect(distill(C(2, 41, 12, 30))).toEqual(C(6, 2, 5, 0));
    });

    it("conserves total wealth", () => {
      const c = C(1, 3, 27, 244);
      expect(totalCp(distill(c))).toBe(totalCp(c));
    });

    it("is idempotent — an already-minimal purse is unchanged", () => {
      const c = C(6, 2, 5, 0);
      expect(distill(c)).toEqual(c);
      expect(distill(distill(c))).toEqual(distill(c));
    });

    it("handles an empty purse", () => {
      expect(distill(C(0, 0, 0, 0))).toEqual(C(0, 0, 0, 0));
    });

    it("does not mutate its input", () => {
      const c = C(0, 0, 0, 123);
      distill(c);
      expect(c).toEqual(C(0, 0, 0, 123));
    });
  });

  describe("coinsEqual", () => {
    it("is true only when every denomination matches", () => {
      expect(coinsEqual(C(1, 2, 3, 4), C(1, 2, 3, 4))).toBe(true);
    });

    it("is false when any single denomination differs", () => {
      expect(coinsEqual(C(1, 2, 3, 4), C(9, 2, 3, 4))).toBe(false); // pp
      expect(coinsEqual(C(1, 2, 3, 4), C(1, 9, 3, 4))).toBe(false); // gp
      expect(coinsEqual(C(1, 2, 3, 4), C(1, 2, 9, 4))).toBe(false); // sp
      expect(coinsEqual(C(1, 2, 3, 4), C(1, 2, 3, 9))).toBe(false); // cp
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
