/**
 * Pure Hit Dice domain model — the framework-free core (no React, Dexie, or DOM).
 *
 * Short-rest healing in 5e spends Hit Dice: each die restores a roll plus the
 * CON modifier. Every function returns a NEW state and never mutates its input.
 * Invariants `hitDiceTotal >= 0` and `0 <= hitDiceAvailable <= hitDiceTotal`
 * hold after every operation.
 */
import type { HpState } from "./hp";

/** The hit-die face size for a class (d6 through d12). */
export type HitDieSize = 6 | 8 | 10 | 12;

export interface HitDiceState {
  hitDieSize: HitDieSize;
  /** Total Hit Dice (= character level). */
  hitDiceTotal: number;
  /** Unspent Hit Dice, in `[0, hitDiceTotal]`. */
  hitDiceAvailable: number;
  /** CON modifier, a signed integer added to each Hit Die roll. */
  conMod: number;
}

/** Set the hit-die size. The {@link HitDieSize} union makes invalid sizes unrepresentable. */
export function setHitDieSize(s: HitDiceState, size: HitDieSize): HitDiceState {
  return { ...s, hitDieSize: size };
}

/**
 * Set the total, enforcing `hitDiceTotal >= 0`. Lowering the total clamps
 * `hitDiceAvailable` down to the new total; raising it leaves available alone.
 */
export function setHitDiceTotal(s: HitDiceState, n: number): HitDiceState {
  const hitDiceTotal = Math.max(0, n);
  const hitDiceAvailable = Math.min(s.hitDiceAvailable, hitDiceTotal);
  return { ...s, hitDiceTotal, hitDiceAvailable };
}

/** Set available Hit Dice, clamped to `[0, hitDiceTotal]`. */
export function setHitDiceAvailable(s: HitDiceState, n: number): HitDiceState {
  const hitDiceAvailable = Math.min(s.hitDiceTotal, Math.max(0, n));
  return { ...s, hitDiceAvailable };
}

/** Set the CON modifier (any signed integer). */
export function setConMod(s: HitDiceState, n: number): HitDiceState {
  return { ...s, conMod: n };
}

/**
 * Spend one Hit Die against the combined HP + Hit Dice state. With no dice
 * available this is a no-op (the same reference is returned). Otherwise the die
 * is consumed and `current` heals by `max(0, roll + conMod)` — a single die's
 * heal is floored at 0 so a negative `conMod` never deals damage — capped at `max`.
 */
export function spendHitDie(
  s: HpState & HitDiceState,
  roll: number,
): HpState & HitDiceState {
  if (s.hitDiceAvailable <= 0) return s;
  const healed = Math.max(0, roll + s.conMod);
  const current = Math.min(s.max, s.current + healed);
  return { ...s, current, hitDiceAvailable: s.hitDiceAvailable - 1 };
}

/**
 * Restore `n` Hit Dice, capped at `hitDiceTotal`. A negative `n` is treated as a
 * no-op (clamped to 0), matching the other ops, so available never goes negative.
 */
export function restoreHitDice(s: HitDiceState, n: number): HitDiceState {
  const hitDiceAvailable = Math.min(s.hitDiceTotal, s.hitDiceAvailable + Math.max(0, n));
  return { ...s, hitDiceAvailable };
}
