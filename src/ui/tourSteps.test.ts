import { describe, expect, it } from "vitest";
import { TOUR_KEY, TOUR_STEPS } from "./tourSteps";

describe("tour content (#178)", () => {
  it("has multiple steps, each with a target + a concise (≤120 char) caption", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(3);
    for (const s of TOUR_STEPS) {
      expect(s.target.length).toBeGreaterThan(0);
      expect(s.caption.length).toBeGreaterThan(0);
      expect(s.caption.length).toBeLessThanOrEqual(120);
    }
  });

  it("has no duplicate targets", () => {
    const targets = TOUR_STEPS.map((s) => s.target);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("targets the real on-screen controls (name, orb, radial hub, rests)", () => {
    const targets = TOUR_STEPS.map((s) => s.target);
    expect(targets).toContain(".character-name"); // #179 — name-your-character step
    expect(targets).toContain(".vessel__orb");
    expect(targets).toContain('[aria-label="Actions"]');
    expect(targets).toContain(".rest-controls");
  });

  it("opens onboarding with the name step (#179 — name-field discoverability, #163)", () => {
    expect(TOUR_STEPS[0]!.target).toBe(".character-name");
    expect(TOUR_STEPS[0]!.caption.length).toBeLessThanOrEqual(120);
  });

  it("uses a stable seen key", () => {
    expect(TOUR_KEY).toBe("hoard-tour-seen");
  });
});
