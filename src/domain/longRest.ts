/**
 * Pure Long Rest rules (5e). Framework-free: no React, Dexie, or DOM.
 *
 * A long rest is full recovery: HP back to max, temporary HP gone, death saves
 * cleared, and — when Hit Dice are tracked — half the pool (min 1) regained,
 * capped at the total. Hit Dice tracking arrives with REST-1, so it is treated
 * as optional here: the function works standalone before that lands, and never
 * invents Hit Dice fields that were not present on the input.
 */
import { EMPTY_DEATH_SAVES } from "./deathSaves";

/**
 * Combined state a long rest acts on. Death saves are flat (`successes` /
 * `failures`) to match the tracker's stored shape, not deathSaves.ts's nested
 * {@link DyingState}. Hit Dice are optional until REST-1 tracks them, and any
 * other fields ride along untouched.
 */
export interface RestState {
  current: number;
  max: number;
  temp: number;
  successes: number;
  failures: number;
  hitDiceTotal?: number;
  hitDiceAvailable?: number;
  [key: string]: unknown;
}

/** Regain half the Hit Dice pool (at least 1), capped at the total. */
function regainHitDice(total: number, available: number): number {
  return Math.min(total, available + Math.max(1, Math.floor(total / 2)));
}

/**
 * Apply a long rest: full HP, no temp, cleared death saves, and — only when
 * Hit Dice are tracked — half the pool (min 1) restored up to the total.
 * Returns a new object; the input is never mutated, and Hit Dice fields are
 * emitted only if they were present.
 */
export function longRest<S extends RestState>(state: S): S {
  const restored: S = {
    ...state,
    current: state.max,
    temp: 0,
    ...EMPTY_DEATH_SAVES,
  };
  if (
    typeof state.hitDiceTotal === "number" &&
    typeof state.hitDiceAvailable === "number"
  ) {
    restored.hitDiceAvailable = regainHitDice(
      state.hitDiceTotal,
      state.hitDiceAvailable,
    );
  }
  return restored;
}
