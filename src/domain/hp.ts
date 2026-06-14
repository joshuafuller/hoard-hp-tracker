/**
 * Pure HP domain model — the framework-free core (no React, Dexie, or DOM).
 *
 * Functions never mutate their input. They return a NEW state, except for a
 * no-op (e.g. non-positive damage/heal), which returns the same reference
 * unchanged. Invariants `0 <= current <= max`, `temp >= 0`, and `max >= 1` hold
 * after every operation.
 */
export interface HpState {
  current: number;
  max: number;
  temp: number;
}

/**
 * Apply `n` damage. Temporary HP absorbs damage first (5e RAW); any overflow
 * reduces `current`. Both pools are floored at 0. A non-positive `n` is a no-op
 * that returns the same state reference.
 */
export function damage(s: HpState, n: number): HpState {
  if (n <= 0) return s;
  const temp = Math.max(0, s.temp - n);
  const overflow = n - (s.temp - temp);
  const current = Math.max(0, s.current - overflow);
  return { ...s, current, temp };
}

/**
 * Heal `current` by `n`, never exceeding `max` and never restoring `temp`.
 * A non-positive `n` is a no-op that returns the same state reference.
 */
export function heal(s: HpState, n: number): HpState {
  if (n <= 0) return s;
  const current = Math.min(s.max, s.current + n);
  return { ...s, current };
}

/**
 * Set temporary HP, non-stacking: the result is `max(currentTemp, n)`.
 * `n <= 0` clears temp to 0 (overriding the non-stacking rule).
 */
export function setTemp(s: HpState, n: number): HpState {
  const temp = n <= 0 ? 0 : Math.max(s.temp, n);
  return { ...s, temp };
}

/**
 * Set `max`, enforcing `max >= 1`. Lowering `max` clamps `current` down to the
 * new max; raising it leaves `current` unchanged. `temp` is a separate pool and
 * is never affected.
 */
export function setMax(s: HpState, n: number): HpState {
  const max = Math.max(1, n);
  const current = Math.min(s.current, max);
  return { ...s, max, current };
}

/** Set `current`, clamped to `[0, max]`. */
export function setCurrent(s: HpState, n: number): HpState {
  const current = Math.min(s.max, Math.max(0, n));
  return { ...s, current };
}
