/**
 * Pluggable roll-effects architecture (#87). Effects attach to the dice roll
 * lifecycle — throw → settle → (crit) → clear — through one registry instead of
 * being hard-wired into the tray/engine, so future flourishes (nat-1/20 cues #92,
 * burning-dice #91) plug in without touching the dice core. Each effect's hooks run
 * isolated (one throwing never blocks the others) and self-gate on `env` (sound when
 * not muted, motion when not reduced-motion).
 */
import type { RollRecord, RolledDie } from "../../../domain/dice";

export interface EffectEnv {
  /** Sound contributions should no-op when true. */
  muted: boolean;
  /** Visual/motion contributions should no-op (or go instant) when true. */
  reducedMotion: boolean;
}

/** A registered roll effect. Every hook is optional — implement only what's needed. */
export interface RollEffect {
  readonly name: string;
  /** A throw was initiated (dice leave the hand). */
  onThrow?(env: EffectEnv): void;
  /** The roll settled and reconciled to a record. */
  onSettle?(record: RollRecord, env: EffectEnv): void;
  /** Once per kept d20 that landed a nat-1 or nat-20 (fired after onSettle). */
  onCrit?(die: RolledDie, env: EffectEnv): void;
  /** The tray was cleared / swept. */
  onClear?(env: EffectEnv): void;
}

export interface EffectBus {
  throw(env: EffectEnv): void;
  settle(record: RollRecord, env: EffectEnv): void;
  clear(env: EffectEnv): void;
}

/** A crit is a KEPT d20 showing nat-1 or nat-20 — the gameplay-meaningful flourish (#92). */
export function critDice(record: RollRecord): RolledDie[] {
  return record.dice.filter((d) => !d.dropped && d.sides === 20 && (d.value === 20 || d.value === 1));
}

/**
 * Build the dispatcher over a fixed set of registered effects. Adding a new effect
 * means adding it to this list (see effects/index.ts) — no change to DiceTray or the
 * engine. Each hook call is isolated so a misbehaving effect can't break a roll.
 */
export function createEffectBus(effects: readonly RollEffect[]): EffectBus {
  const run = (name: string, fn: () => unknown) => {
    try {
      const result = fn();
      // Hooks are typed `() => void`, but TS still allows an async hook (returning a
      // Promise) whose rejection would bypass this try/catch and surface as an unhandled
      // rejection — swallow that too so the "isolated" guarantee holds (Copilot #87).
      if (result && typeof (result as { then?: unknown }).then === "function") {
        void (result as Promise<unknown>).catch((err) =>
          console.warn(`[hoard] roll effect "${name}" rejected; ignoring`, err),
        );
      }
    } catch (err) {
      console.warn(`[hoard] roll effect "${name}" threw; ignoring`, err);
    }
  };
  return {
    throw(env) {
      for (const e of effects) if (e.onThrow) run(e.name, () => e.onThrow!(env));
    },
    settle(record, env) {
      for (const e of effects) if (e.onSettle) run(e.name, () => e.onSettle!(record, env));
      for (const die of critDice(record)) {
        for (const e of effects) if (e.onCrit) run(e.name, () => e.onCrit!(die, env));
      }
    },
    clear(env) {
      for (const e of effects) if (e.onClear) run(e.name, () => e.onClear!(env));
    },
  };
}
