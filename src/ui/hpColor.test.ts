import { describe, expect, it } from "vitest";
import { hpColor, type Rgb, rgbCss } from "./hpColor";

// Anchor colors (the --hp-* tokens, Molten Hoard: emerald → gold → ruby), sRGB 0..1.
const GREEN: Rgb = [0x4f / 255, 0xb4 / 255, 0x77 / 255];
const AMBER: Rgb = [0xe8 / 255, 0xb4 / 255, 0x5a / 255];
const RED: Rgb = [0xd8 / 255, 0x45 / 255, 0x3b / 255];
const DOWN: Rgb = [0x6b / 255, 0x63 / 255, 0x54 / 255];

const CHANNELS = [0, 1, 2] as const;
const near = (a: Rgb, b: Rgb, p = 1) => CHANNELS.forEach((i) => expect(a[i]).toBeCloseTo(b[i], p));
const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("hpColor", () => {
  it("is the healthy green at full HP", () => near(hpColor(10, 10), GREEN));
  it("is bloodied amber at exactly half", () => near(hpColor(5, 10), AMBER));
  it("is critical red at exactly a quarter", () => near(hpColor(25, 100), RED));
  it("holds red below a quarter", () => near(hpColor(5, 100), RED));
  it("is the grey down color at 0 or below", () => {
    near(hpColor(0, 10), DOWN);
    near(hpColor(-3, 10), DOWN);
  });

  it("interpolates between anchors (70% sits between amber and green)", () => {
    const c = hpColor(7, 10);
    // OKLab interpolation isn't per-channel-linear in sRGB, so asserting each
    // channel stays within the endpoints' range is the wrong invariant. The real
    // property: the blend is a point strictly inside the amber→green segment — so
    // it's distinct from both anchors and closer to each than the anchors are to
    // each other (it can't have overshot past either end).
    const span = dist(AMBER, GREEN);
    expect(dist(c, AMBER)).toBeLessThan(span);
    expect(dist(c, GREEN)).toBeLessThan(span);
    expect(c).not.toEqual(AMBER);
    expect(c).not.toEqual(GREEN);
  });

  it("is continuous across the tier thresholds (no visible jump)", () => {
    const step = (r: number) => hpColor(Math.round(r * 1000), 1000);
    for (const t of [0.5, 0.25]) {
      expect(dist(step(t - 0.005), step(t + 0.005))).toBeLessThan(0.06); // smooth, not a step
    }
  });

  it("rgbCss formats a CSS color", () => {
    expect(rgbCss([1, 0, 0.5])).toBe("rgb(255 0 128)");
  });
});
