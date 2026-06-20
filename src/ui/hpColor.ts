/**
 * Continuous HP colour. Instead of snapping between the discrete health tiers,
 * this interpolates through the same tier anchor colours as a smooth function of
 * the `current / max` ratio, so the orb, halo, and numerals fade gradually as HP
 * changes. Interpolation happens in OKLab (perceptually uniform) so the blend
 * never passes through muddy intermediate hues. Drives both the WebGL fluid tint
 * and the CSS `--accent`.
 */

export type Rgb = [number, number, number];

const hex = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];

// Gradient anchors — Molten Hoard is gold-forward: the orb reads as molten gold
// across the top half of HP and only tides to ruby as you drop low.
const GREEN = hex("#f4c66a"); // full      @ ratio 1.0 (bright molten gold)
const AMBER = hex("#e8b45a"); // half      @ ratio 0.5 (gold)
const RED = hex("#d8453b"); //  critical  @ ratio 0.25 (and below) — ruby when low
const DOWN = hex("#6b6354"); //  down      @ current <= 0

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

/** Continuous HP colour (sRGB 0..1) for the given current/max. */
export function hpColor(current: number, max: number): Rgb {
  if (current <= 0 || max <= 0) return DOWN;
  const r = Math.min(1, current / max);
  if (r >= 0.5) return mixOklab(AMBER, GREEN, (r - 0.5) / 0.5); // half → full
  if (r >= 0.25) return mixOklab(RED, AMBER, (r - 0.25) / 0.25); // quarter → half
  return RED; // hold critical red below a quarter
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
