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

  it("maps drag travel (offset from the tap threshold) to whole HP (#228)", () => {
    // travel = |33| − 6 = 27 of a usable 194 px; 27/194·40 = 5.57 → ceil = 6.
    expect(dragAmount(33, 200, 40).amount).toBe(6);
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

describe("dragAmount — 1 HP must be reachable by a small drag (#228)", () => {
  it("a committed drag just past the tap threshold applies exactly 1 (no dead zone)", () => {
    // max 10, orbPx 200: OLD round(7/200*10)=round(0.35)=0 → the drag applied nothing.
    expect(dragAmount(DRAG_TAP_THRESHOLD + 1, 200, 10).amount).toBe(1);
  });

  it("a small drag lands on 1, not 2 — never skips the first point (the reported bug)", () => {
    // max 40, orbPx 200: OLD round(9/200*40)=round(1.8)=2 → user got 2 when they wanted 1.
    expect(dragAmount(9, 200, 40).amount).toBe(1);
    expect(dragAmount(-9, 200, 40)).toEqual({ kind: "heal", amount: 1 });
  });

  it("steps up by whole HP as travel grows, still reaching max at a full orb-height", () => {
    const amt = (dy: number) => dragAmount(dy, 200, 40).amount;
    expect(amt(8)).toBe(1); // smallest committed drags = 1
    expect(amt(200)).toBe(40); // full height = max (proportionality preserved)
    // monotonic non-decreasing as the drag grows
    let prev = 0;
    for (let dy = DRAG_TAP_THRESHOLD; dy <= 200; dy += 4) {
      const a = dragAmount(dy, 200, 40).amount;
      expect(a).toBeGreaterThanOrEqual(prev);
      prev = a;
    }
  });
});
