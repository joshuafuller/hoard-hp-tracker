import { describe, expect, it } from "vitest";
import { dragAmount, DRAG_TAP_THRESHOLD, isTap } from "./dragInput";

describe("dragAmount", () => {
  it("drag down is damage, drag up is heal", () => {
    expect(dragAmount(50, 200, 40).kind).toBe("damage");
    expect(dragAmount(-50, 200, 40).kind).toBe("heal");
  });

  it("is proportional to the orb height (full orb-height = max)", () => {
    expect(dragAmount(200, 200, 40).amount).toBe(40); // full height → max
    expect(dragAmount(100, 200, 40).amount).toBe(20); // half height → half max
    expect(dragAmount(50, 200, 40).amount).toBe(10); // quarter → quarter
  });

  it("clamps past a full orb-height to max", () => {
    expect(dragAmount(400, 200, 40).amount).toBe(40);
  });

  it("uses magnitude regardless of direction", () => {
    expect(dragAmount(-100, 200, 40).amount).toBe(20);
  });

  it("is zero for a degenerate orb or max", () => {
    expect(dragAmount(100, 0, 40).amount).toBe(0);
    expect(dragAmount(100, 200, 0).amount).toBe(0);
  });

  it("rounds to whole HP", () => {
    expect(dragAmount(33, 200, 40).amount).toBe(Math.round((33 / 200) * 40));
  });
});

describe("isTap", () => {
  it("treats sub-threshold travel as a tap", () => {
    expect(isTap(0)).toBe(true);
    expect(isTap(DRAG_TAP_THRESHOLD - 1)).toBe(true);
    expect(isTap(-(DRAG_TAP_THRESHOLD - 1))).toBe(true);
  });
  it("treats larger travel as a drag", () => {
    expect(isTap(DRAG_TAP_THRESHOLD + 1)).toBe(false);
    expect(isTap(-50)).toBe(false);
  });
});
