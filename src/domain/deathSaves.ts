/**
 * Pure death-saving-throw rules (5e). Framework-free: no React, Dexie, or DOM.
 * Death saves only matter at 0 HP; the `reconcile` helper enforces that invariant.
 */

/** Tally of death-save successes and failures, each in the range 0..3. */
export interface DeathSaves {
  successes: number;
  failures: number;
}

/** Where a creature stands, derived from current HP and its death-save tally. */
export type DyingStatus = "alive" | "dying" | "stable" | "dead";

/** Combined HP + death-save state, used by rolls that can also restore HP. */
export interface DyingState {
  current: number;
  deathSaves: DeathSaves;
}

export const EMPTY_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

/** A pip track holds at most three marks. */
const clampPip = (n: number): number => Math.max(0, Math.min(3, Math.trunc(n)));

/** Reset both tracks to zero. */
export function reset(): DeathSaves {
  return { ...EMPTY_DEATH_SAVES };
}

/** Set the success track (e.g. tapping a pip), clamped to 0..3. */
export function setSuccesses(ds: DeathSaves, n: number): DeathSaves {
  return { ...ds, successes: clampPip(n) };
}

/** Set the failure track (e.g. tapping a pip), clamped to 0..3. */
export function setFailures(ds: DeathSaves, n: number): DeathSaves {
  return { ...ds, failures: clampPip(n) };
}

/** Add one success, clamped. */
export function addSuccess(ds: DeathSaves): DeathSaves {
  return setSuccesses(ds, ds.successes + 1);
}

/** Add `count` failures (a crit / nat 1 adds two), clamped. */
export function addFailure(ds: DeathSaves, count = 1): DeathSaves {
  return setFailures(ds, ds.failures + count);
}

/**
 * Resolve the dying status. Failure outranks success on a tie (3/3 is dead),
 * and any HP above 0 means you are simply alive.
 */
export function statusFor(current: number, ds: DeathSaves): DyingStatus {
  if (current > 0) return "alive";
  if (ds.failures >= 3) return "dead";
  if (ds.successes >= 3) return "stable";
  return "dying";
}

/**
 * Apply a d20 death-save roll while dying:
 * - nat 20 → regain 1 HP and clear the saves,
 * - nat 1  → two failures,
 * - 10..19 → one success,
 * - 2..9   → one failure.
 */
export function applyDeathRoll(state: DyingState, roll: number): DyingState {
  // Rolls are injectable, so defend against out-of-range / fractional input:
  // truncate to an integer and clamp into the d20 face range before judging.
  const r = Math.max(1, Math.min(20, Math.trunc(roll)));
  if (r === 20) return { current: 1, deathSaves: reset() };
  if (r === 1) return { ...state, deathSaves: addFailure(state.deathSaves, 2) };
  if (r >= 10) return { ...state, deathSaves: addSuccess(state.deathSaves) };
  return { ...state, deathSaves: addFailure(state.deathSaves) };
}

/** Invariant: death saves only exist at 0 HP — clear them whenever current > 0. */
export function reconcile(current: number, ds: DeathSaves): DeathSaves {
  return current > 0 ? reset() : ds;
}
