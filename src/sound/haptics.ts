/**
 * Centralized, intentional haptics (#245). One guarded `vibrate` + named patterns per
 * event, so the whole app's tactile feel is consistent and matches the sound cues
 * (sound-design.md: "the sound is what the haptic would sound like"). A silent no-op
 * where the Vibration API is absent — notably **iOS Safari/PWA**, which blocks
 * `navigator.vibrate` entirely; there is no reliable web workaround, so iPhone users
 * simply don't feel it (graceful, no errors). Gated on **mute**, so the mute button
 * silences sound AND tactile together.
 */
import { isSoundEnabled } from "./soundSettings";

/** Named haptic patterns — a single ms duration, or an [on, off, on, …] pattern.
 *  Paired with the sound cues; the heartbeat mirrors the S1/S2 bass lub-dub (#243). */
export const HAPTICS = {
  tap: 10, // a generic control tap (coins, keypad, value steppers)
  pip: 8, // a death-save pip
  roll: 12, // a dice throw
  rollResult: [14, 36, 14], // a settled contextual roll (death-save d20)
  commit: [12, 30, 12], // an applied/committed action (a rest)
  damage: 16, // a blunt thud — firmer than a tap
  heal: [10, 40, 10], // a gentle two-tap lift
  crit: [18, 34, 28], // nat-20 — a celebratory rising double
  fumble: [44, 60, 14], // nat-1 — a heavy stumble then a weak tail
  heartbeat: [40, 110, 26], // lub · gap · dub — mirrors the bass heartbeat
} as const;

export type HapticName = keyof typeof HAPTICS;

/** True where the Vibration API is usable (false on iOS web, SSR, etc.). */
export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Fire a named haptic. Gated on the **mute** preference — muting silences sound AND
 *  tactile everywhere (the user's intent), so every call site obeys it for free. A
 *  silent no-op where unsupported (iOS web); swallows a blocked/again call. */
export function haptic(name: HapticName): void {
  if (!isSoundEnabled() || !canVibrate()) return;
  try {
    navigator.vibrate(HAPTICS[name] as number | number[]);
  } catch {
    /* best-effort: a vibrate blocked before a gesture just doesn't fire */
  }
}
