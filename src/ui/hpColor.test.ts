import { describe, expect, it } from "vitest";
import { hpColor, type Rgb, rgbCss } from "./hpColor";

// Molten Hoard danger ladder (Option A, #164): healthy gold → bloodied RED (≤50%)
// → critical deeper red (≤25%) → grey down (0). sRGB 0..1.
const GOLD_FULL: Rgb = [0xf4 / 255, 0xc6 / 255, 0x6a / 255];
const GOLD_HALF: Rgb = [0xe8 / 255, 0xb4 / 255, 0x5a / 255];
const BLOODIED: Rgb = [0xd8 / 255, 0x45 / 255, 0x3b / 255];
const CRITICAL: Rgb = [0x8f / 255, 0x1b / 255, 0x13 / 255];
const DOWN: Rgb = [0x6b / 255, 0x63 / 255, 0x54 / 255];

const CHANNELS = [0, 1, 2] as const;
const near = (a: Rgb, b: Rgb, p = 1) => CHANNELS.forEach((i) => expect(a[i]).toBeCloseTo(b[i], p));
const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
// "Reads red" = closer to bloodied red than to healthy gold (gold also has a high red
// channel, so a naive r>g>b test would call gold 'red' — compare to the anchors instead).
const readsRed = (c: Rgb) => dist(c, BLOODIED) < dist(c, GOLD_HALF);

describe("hpColor (bloodied → red, #164)", () => {
  it("is healthy gold at full HP", () => near(hpColor(10, 10), GOLD_FULL));

  it("reads RED at exactly half HP — bloodied is the danger colour, not gold (#164)", () => {
    near(hpColor(5, 10), BLOODIED);
    expect(readsRed(hpColor(5, 10))).toBe(true);
  });

  it("stays bloodied red across the whole bloodied band (>25%–50%)", () => {
    for (const r of [0.5, 0.4, 0.3, 0.26]) {
      expect(readsRed(hpColor(Math.round(r * 1000), 1000)), `r=${r}`).toBe(true);
    }
  });

  it("deepens to a distinct critical red at a quarter and below", () => {
    near(hpColor(25, 100), CRITICAL);
    near(hpColor(5, 100), CRITICAL);
    expect(lum(hpColor(25, 100))).toBeLessThan(lum(BLOODIED)); // critical is darker / more alarming
  });

  it("is the grey down colour at 0 or below", () => {
    near(hpColor(0, 10), DOWN);
    near(hpColor(-3, 10), DOWN);
  });

  it("keeps the healthy zone (>50%) a smooth gold gradient", () => {
    const c = hpColor(7, 10); // 70%
    const span = dist(GOLD_HALF, GOLD_FULL);
    expect(dist(c, GOLD_HALF)).toBeLessThan(span);
    expect(dist(c, GOLD_FULL)).toBeLessThan(span);
    expect(readsRed(c)).toBe(false);
  });

  it("flips crisply gold → red at the half line (deliberate bloodied threshold, #164)", () => {
    const justAbove = hpColor(501, 1000); // 50.1% — still healthy
    const atHalf = hpColor(500, 1000); //    50.0% — bloodied
    expect(readsRed(justAbove)).toBe(false);
    expect(readsRed(atHalf)).toBe(true);
    expect(dist(justAbove, atHalf)).toBeGreaterThan(0.2); // a clear, glanceable step
  });

  it("rgbCss formats a CSS color", () => {
    expect(rgbCss([1, 0, 0.5])).toBe("rgb(255 0 128)");
  });
});
