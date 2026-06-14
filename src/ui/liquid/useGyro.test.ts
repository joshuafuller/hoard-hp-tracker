import { describe, expect, it } from "vitest";
import { gravityFromOrientation, projectGravity } from "./useGyro";

// `projectGravity(betaDeg, gammaDeg)` maps device-orientation Euler angles to a
// screen-space gravity vector (x right, y DOWN). It is NOT normalized: its
// magnitude shrinks toward ~0 as the screen approaches horizontal, so the sim
// applies gentle (not amplified) gravity when the phone is flat. A small
// downward floor keeps a flat screen resting calmly at the bottom.

const FLOOR = 0.15; // the gentle downward bias used when the screen is flat

describe("projectGravity", () => {
  it("points down the screen when held upright (beta≈90)", () => {
    const g = projectGravity(90, 0);
    expect(g.x).toBeCloseTo(0, 6);
    expect(g.y).toBeGreaterThan(0.9); // strong, downward
  });

  it("does NOT reverse when tilted forward past vertical (face going down)", () => {
    // beta sweeping 90 → 180 (top edge tipping away, screen turning to face the
    // floor). The vertical pull must stay downward (positive) the whole way —
    // never flip sign — and weaken monotonically toward the flat floor value.
    const ys = [90, 110, 135, 160, 180].map((b) => projectGravity(b, 0).y);
    let prev = Infinity;
    for (const y of ys) {
      expect(y).toBeGreaterThan(0); // never reverses
      expect(y).toBeLessThanOrEqual(prev + 1e-9); // monotonic weakening
      prev = y;
    }
    expect(ys.at(-1)).toBeCloseTo(FLOOR, 6); // face-down flat → just the floor
  });

  it("applies only the gentle floor when flat on its back (beta≈0)", () => {
    const g = projectGravity(0, 0);
    expect(g.x).toBeCloseTo(0, 6);
    expect(g.y).toBeCloseTo(FLOOR, 6);
    expect(Math.hypot(g.x, g.y)).toBeLessThan(0.3); // weak — won't amplify noise
  });

  it("has near-zero in-plane magnitude near horizontal (flat) vs full when upright", () => {
    const mag = (g: { x: number; y: number }) => Math.hypot(g.x, g.y);
    expect(mag(projectGravity(0, 0))).toBeLessThan(0.3);
    expect(mag(projectGravity(70, 0))).toBeGreaterThan(0.9);
  });

  it("tilts toward the low side when rolled while upright", () => {
    const right = projectGravity(70, 30); // rolled right
    const left = projectGravity(70, -30); // rolled left
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
  });

  it("inverts the roll direction once tilted past vertical (face-down)", () => {
    // Same physical roll, but with the screen facing down the world-right
    // direction maps to screen-left, so x must flip sign vs. the upright case.
    const upright = projectGravity(70, 30).x;
    const pastVertical = projectGravity(110, 30).x;
    expect(Math.sign(pastVertical)).toBe(-Math.sign(upright));
  });

  it("pulls toward the screen top when the phone is held upside down", () => {
    // beta = -90: physically inverted, world-down is now the screen's top edge.
    expect(projectGravity(-90, 0).y).toBeLessThan(0);
  });
});

// `gravityFromOrientation(beta, gamma)` resolves a raw DeviceOrientation event
// (either angle may be null) into the same screen-space gravity vector. It is
// the single source of truth the `onOrient` handler delegates to, so partial
// events — notably gamma-only (roll) with no pitch — must not silently drop the
// information they DO carry. Regression guard for the #9 `cos(beta)` projection,
// where a `beta ?? 90` fallback zeroed roll (cos(90°) = 0).

describe("gravityFromOrientation", () => {
  it("still tilts toward the rolled-low side when only gamma is reported (beta null)", () => {
    // Phone rolled right then left with no pitch data. Roll must survive and
    // keep the SAME sign convention as projectGravity's upright-roll case.
    const right = gravityFromOrientation(null, 30);
    const left = gravityFromOrientation(null, -30);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
    expect(Math.sign(right.x)).toBe(Math.sign(projectGravity(70, 30).x));
    expect(Math.sign(left.x)).toBe(Math.sign(projectGravity(70, -30).x));
  });

  it("never reverses the downward pull on a gamma-only event", () => {
    // Across the spec gamma range the vertical component stays downward.
    for (const gamma of [-90, -45, 0, 45, 90]) {
      expect(gravityFromOrientation(null, gamma).y).toBeGreaterThanOrEqual(0);
    }
  });

  it("rests straight down when no usable angle is present", () => {
    expect(gravityFromOrientation(null, 0)).toEqual({ x: 0, y: 1 });
    expect(gravityFromOrientation(null, null)).toEqual({ x: 0, y: 1 });
  });

  it("matches projectGravity when both angles are present", () => {
    expect(gravityFromOrientation(70, 30)).toEqual(projectGravity(70, 30));
    expect(gravityFromOrientation(0, 0)).toEqual(projectGravity(0, 0));
  });

  it("defaults missing gamma to no roll", () => {
    expect(gravityFromOrientation(70, null).x).toBeCloseTo(projectGravity(70, 0).x, 6);
  });
});
