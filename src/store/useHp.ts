import { useLiveQuery } from "dexie-react-hooks";
import { db as defaultDb, HP_ID, type HpDb, type HpRecord } from "./db";
import {
  damage,
  heal,
  setCurrent,
  setMax,
  setTemp,
  type HpState,
} from "../domain/hp";
import {
  addFailure,
  applyDeathRoll,
  type DeathSaves,
  type DyingStatus,
  reconcile,
  setFailures as dsSetFailures,
  setSuccesses as dsSetSuccesses,
  statusFor,
} from "../domain/deathSaves";
import {
  type HitDieSize,
  setConMod,
  setHitDiceAvailable,
  setHitDiceTotal,
  setHitDieSize,
  spendHitDie,
} from "../domain/hitDice";
import { longRest } from "../domain/longRest";

/** Reactive HP + death-save state plus the actions that mutate it. */
export interface UseHpResult extends HpState {
  successes: number;
  failures: number;
  status: DyingStatus;
  /** True once the live DB record has loaded (vs. the initial seed fallback). */
  hydrated: boolean;
  hitDieSize: HitDieSize;
  hitDiceTotal: number;
  hitDiceAvailable: number;
  conMod: number;
  damage: (n: number) => Promise<void>;
  heal: (n: number) => Promise<void>;
  setTemp: (n: number) => Promise<void>;
  setMax: (n: number) => Promise<void>;
  setCurrent: (n: number) => Promise<void>;
  setSuccesses: (n: number) => Promise<void>;
  setFailures: (n: number) => Promise<void>;
  rollDeathSave: (roll?: number) => Promise<void>;
  /** Set temp HP to an exact value (clamped >=0), bypassing the non-stacking rule. */
  setTempValue: (n: number) => Promise<void>;
  /** Relative steppers — read fresh inside the transaction so rapid taps accumulate. */
  stepCurrent: (delta: number) => Promise<void>;
  stepMax: (delta: number) => Promise<void>;
  stepTemp: (delta: number) => Promise<void>;
  setHitDieSize: (size: HitDieSize) => Promise<void>;
  setHitDiceTotal: (n: number) => Promise<void>;
  setHitDiceAvailable: (n: number) => Promise<void>;
  setConMod: (n: number) => Promise<void>;
  shortRest: (roll?: number) => Promise<void>;
  longRest: () => Promise<void>;
}

const SEED: HpRecord = {
  id: HP_ID,
  current: 10,
  max: 10,
  temp: 0,
  successes: 0,
  failures: 0,
  hitDieSize: 8,
  hitDiceTotal: 1,
  hitDiceAvailable: 1,
  conMod: 0,
};

const d20 = () => Math.floor(Math.random() * 20) + 1;

const savesOf = (r: HpRecord): DeathSaves => ({
  successes: r.successes,
  failures: r.failures,
});
const hpOf = (r: HpRecord): HpState => ({
  current: r.current,
  max: r.max,
  temp: r.temp,
});

/**
 * Reactive hook over the single persisted record. All rules live in the pure
 * `domain/` modules; this hook reads fresh inside a serialized `rw` transaction,
 * applies the pure function, and writes back — so rapid taps never clobber.
 */
export function useHp(db: HpDb = defaultDb): UseHpResult {
  const record = useLiveQuery(() => db.hp.get(HP_ID), [db]);
  const state: HpRecord = record ?? SEED;

  const write = (fn: (r: HpRecord) => HpRecord) => () =>
    db.transaction("rw", db.hp, async () => {
      const current = (await db.hp.get(HP_ID)) ?? SEED;
      await db.hp.put({ ...fn(current), id: HP_ID });
    });

  // HP ops run the pure HP function, then reconcile death saves (saves only
  // exist at 0 HP, so any move above 0 clears them).
  const applyHp =
    (op: (s: HpState, n: number) => HpState) => (n: number) =>
      write((r) => {
        const hp = op(hpOf(r), n);
        return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)) };
      })();

  // Damage is an HP op, plus the 5e rule: taking damage while ALREADY dying
  // (at 0 HP) is a death-save failure (the third is fatal). Dropping from >0 to
  // 0 just starts dying — no failure.
  const damageAction = (n: number) =>
    write((r) => {
      const hp = damage(hpOf(r), n);
      let saves = reconcile(hp.current, savesOf(r));
      if (n > 0 && r.current === 0 && statusFor(r.current, saves) === "dying") {
        saves = addFailure(saves, 1);
      }
      return { ...r, ...hp, ...saves };
    })();

  // Pip writes are reconciled against current HP: death saves only exist at 0 HP,
  // so a write while alive is dropped (keeps the invariant; avoids hidden pips).
  const applySaves =
    (op: (ds: DeathSaves, n: number) => DeathSaves) => (n: number) =>
      write((r) => ({ ...r, ...reconcile(r.current, op(savesOf(r), n)) }))();

  // Relative steppers read the *fresh* record inside the transaction, so a burst
  // of ± taps (or hold-to-repeat) accumulates instead of clobbering on stale state.
  const stepHp =
    (op: (s: HpState, n: number) => HpState, read: (s: HpState) => number) =>
    (delta: number) =>
      write((r) => {
        const hp = op(hpOf(r), read(hpOf(r)) + delta);
        return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)) };
      })();

  // Temp HP set to an exact value (clamped >=0) for the editor — distinct from the
  // domain's non-stacking `setTemp`, which can't lower temp.
  const setTempValue = (n: number) =>
    write((r) => ({ ...r, temp: Math.max(0, Math.trunc(n)) }))();
  const stepTemp = (delta: number) =>
    write((r) => ({ ...r, temp: Math.max(0, r.temp + delta) }))();

  // Only roll while actually dying. Rolling when alive (would drop HP to 1 on a 20)
  // or when already stable/dead (a queued double-tap reviving a corpse) is a no-op
  // that just reconciles any stray saves.
  const rollDeathSave = (roll: number = d20()) =>
    write((r) => {
      const saves = savesOf(r);
      if (statusFor(r.current, saves) !== "dying") {
        return { ...r, ...reconcile(r.current, saves) };
      }
      const next = applyDeathRoll({ current: r.current, deathSaves: saves }, roll);
      return { ...r, current: next.current, ...next.deathSaves };
    })();

  // Hit-dice setters operate on the HitDiceState subset; spread back over the record.
  const setHd =
    <T,>(op: (r: HpRecord, n: T) => Partial<HpRecord>) => (n: T) =>
      write((r) => ({ ...r, ...op(r, n) }))();

  // Short rest: spend one Hit Die (real d{size} unless a roll is injected). If it
  // heals a downed hero above 0, reconcile clears their death saves.
  const shortRest = (roll?: number) =>
    write((r) => {
      const d = roll ?? Math.floor(Math.random() * r.hitDieSize) + 1;
      const next = spendHitDie(r, d);
      return { ...r, ...next, ...reconcile(next.current, savesOf(r)) };
    })();

  return {
    current: state.current,
    max: state.max,
    temp: state.temp,
    successes: state.successes,
    failures: state.failures,
    status: statusFor(state.current, savesOf(state)),
    hydrated: record !== undefined,
    hitDieSize: state.hitDieSize,
    hitDiceTotal: state.hitDiceTotal,
    hitDiceAvailable: state.hitDiceAvailable,
    conMod: state.conMod,
    damage: damageAction,
    heal: applyHp(heal),
    setTemp: applyHp(setTemp),
    setMax: applyHp(setMax),
    setCurrent: applyHp(setCurrent),
    setSuccesses: applySaves(dsSetSuccesses),
    setFailures: applySaves(dsSetFailures),
    rollDeathSave,
    setTempValue,
    stepCurrent: stepHp(setCurrent, (s) => s.current),
    stepMax: stepHp(setMax, (s) => s.max),
    stepTemp,
    setHitDieSize: setHd<HitDieSize>(setHitDieSize),
    setHitDiceTotal: setHd<number>(setHitDiceTotal),
    setHitDiceAvailable: setHd<number>(setHitDiceAvailable),
    setConMod: setHd<number>(setConMod),
    shortRest,
    // Pass longRest a fresh literal of just the fields it acts on (object literals
    // satisfy RestState's index signature), then spread the recovered fields back
    // onto the full record.
    longRest: () =>
      write((r) => ({
        ...r,
        ...longRest({
          current: r.current,
          max: r.max,
          temp: r.temp,
          successes: r.successes,
          failures: r.failures,
          hitDiceTotal: r.hitDiceTotal,
          hitDiceAvailable: r.hitDiceAvailable,
        }),
      }))(),
  };
}
