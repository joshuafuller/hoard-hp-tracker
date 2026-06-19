/**
 * Pure Concentration rules (5e). Framework-free: no React, Dexie, or DOM.
 *
 * Per PHB/2024 rules: when a concentrating caster takes damage they must make
 * a Constitution saving throw. The DC is the higher of 10 and half the damage
 * taken (rounded down).
 */

/**
 * The Constitution save DC for a Concentration check after taking `damage`
 * points. DC = max(10, floor(damage / 2)). Negative damage is treated as 0.
 */
export function concentrationDC(damage: number): number {
  return Math.max(10, Math.floor(Math.max(0, damage) / 2));
}
