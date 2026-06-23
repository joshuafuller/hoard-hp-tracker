/**
 * HP colour, led by the 5e rules (#164). "Bloodied" is a binary state — at or below
 * half HP — so the orb makes a crisp, glanceable flip to RED at the half line rather
 * than easing through gold: healthy reads gold, ≤50% reads bloodied red, ≤25% deepens
 * to critical red, and 0 is the grey "down" tier. The healthy zone stays a smooth gold
 * gradient (OKLab-interpolated, perceptually uniform); the danger tiers are discrete so
 * "am I bloodied?" needs no interpretation. Drives the WebGL fluid tint and CSS `--accent`.
 */

export type Rgb = [number, number, number];

const hex = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

// Tier anchors — gold in the healthy top half, then the rules-led danger reds (#164).
const GOLD_FULL = hex("#f4c66a"); // full HP            @ ratio 1.0 (bright molten gold)
const GOLD_HALF = hex("#e8b45a"); // just above half    @ ratio →0.5⁺ (gold)
const BLOODIED = hex("#d8453b"); //  bloodied  ≤50%     — the 5e danger threshold (red)
const CRITICAL = hex("#8f1b13"); //  critical  ≤25%     — deepest red (WebGL orb fill; CSS text
//                                   uses a lighter readable critical — see styles.css/DESIGN.md)
const DOWN = hex("#6b6354"); //      down      current ≤ 0 (grey)

/**
 * Tier thresholds (current/max), the single source of truth shared with `tierFor`
 * (HpBar.tsx) so the orb colour and the tier classification never drift (#164).
 * "Bloodied" = at or below half HP (5e convention); "critical" = at or below a quarter.
 */
export const BLOODIED_AT = 0.5;
export const CRITICAL_AT = 0.25;

// ── sRGB ↔ OKLab (Björn Ottosson) ──────────────────────────────────────────
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c: number) => (c < 0 ? 0 : c > 1 ? 1 : c);

function srgbToOklab([r, g, b]: Rgb): Rgb {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToSrgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    clamp01(toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    clamp01(toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ];
}

/** Blend two sRGB colours in OKLab. `t` 0 → a, 1 → b. */
export function mixOklab(a: Rgb, b: Rgb, t: number): Rgb {
  const A = srgbToOklab(a), B = srgbToOklab(b);
  return oklabToSrgb([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** HP colour (sRGB 0..1) for the given current/max — see the tier ladder above (#164). */
export function hpColor(current: number, max: number): Rgb {
  if (current <= 0 || max <= 0) return DOWN;
  const r = Math.min(1, current / max);
  // Healthy (>50%): smooth gold gradient across the top half.
  if (r > BLOODIED_AT) return mixOklab(GOLD_HALF, GOLD_FULL, (r - BLOODIED_AT) / (1 - BLOODIED_AT));
  // Bloodied (≤50%): crisp flip to red — the binary 5e danger threshold.
  if (r > CRITICAL_AT) return BLOODIED;
  // Critical (≤25%): deepest red.
  return CRITICAL;
}

const ch = (c: number) => Math.round(clamp01(c) * 255);

/** `rgb(r g b)` for a CSS custom property. */
export function rgbCss([r, g, b]: Rgb): string {
  return `rgb(${ch(r)} ${ch(g)} ${ch(b)})`;
}

/** Translucent glow of the same colour, for `--accent-glow`. */
export function glowCss([r, g, b]: Rgb, alpha = 0.45): string {
  return `rgba(${ch(r)}, ${ch(g)}, ${ch(b)}, ${alpha})`;
}
