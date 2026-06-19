import { describe, expect, it } from "vitest";
import { concentrationDC } from "./concentration";

describe("concentrationDC", () => {
  it("returns 10 for 0 damage", () => {
    expect(concentrationDC(0)).toBe(10);
  });

  it("returns 10 for damage below the threshold (1)", () => {
    expect(concentrationDC(1)).toBe(10);
  });

  it("returns 10 for damage at 21 (floor(21/2)=10, max still 10)", () => {
    expect(concentrationDC(21)).toBe(10);
  });

  it("returns 11 for damage of 22 (floor(22/2)=11, above 10)", () => {
    expect(concentrationDC(22)).toBe(11);
  });

  it("returns 15 for damage of 30 (floor(30/2)=15)", () => {
    expect(concentrationDC(30)).toBe(15);
  });

  it("returns 20 for damage of 40 (floor(40/2)=20)", () => {
    expect(concentrationDC(40)).toBe(20);
  });

  it("returns 10 for negative damage (treated as 0 effective)", () => {
    expect(concentrationDC(-5)).toBe(10);
  });
});
