import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db as defaultDb, HP_ID, type HpDb, type HpRecord, isReloading } from "./db";
import {
  damage,
  heal,
  setCurrent,
  setMax,
  setTemp,
  type HpState,
} from "../domain/hp";
import { concentrationDC } from "../domain/concentration";
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

/**
 * A transient concentration check prompt. Surfaced when damage is taken while
 * concentrating; the UI shows the DC and the player resolves it (keeps/drops).
 */
export interface ConcentrationCheck {
  /** The Constitution save DC (max(10, floor(damage/2))). */
  dc: number;
  /** The damage that triggered the check. */
  damage: number;
}

/** The last undoable HP change, surfaced to the UI for the Undo pill. */
export interface HpLastChange {
  kind: "damage" | "heal" | "set" | "temp";
  /** The operand passed to the action — a delta for damage/heal, an absolute value for set/temp. */
  amount: number;
  /** The HP-bearing fields as they were *before* the action, for undo. */
  before: Pick<HpRecord, "current" | "temp" | "successes" | "failures" | "concentrating">;
}

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
  /** The optional character name, blank by default. */
  name: string;
  /** Whether the character is currently concentrating on a spell. */
  concentrating: boolean;
  /** Transient prompt shown after taking damage while concentrating. Null otherwise. */
  concentrationCheck: ConcentrationCheck | null;
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
  /** Set the character name; trimmed to ≤24 chars. Empty string clears the name. */
  setName: (s: string) => Promise<void>;
  /** Enable or disable concentration. Enabling at 0 HP is a no-op. */
  setConcentrating: (on: boolean) => Promise<void>;
  shortRest: (roll?: number) => Promise<void>;
  longRest: () => Promise<void>;
  undo: () => Promise<void>;
  /** Clear the last-change pill without reverting. Synchronous; no DB write. */
  dismissLastChange: () => void;
  lastChange: HpLastChange | null;
  /** Dismiss the concentration check prompt without dropping concentration. Synchronous; no DB write. */
  dismissConcentrationCheck: () => void;
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
  pp: 0,
  gp: 0,
  sp: 0,
  cp: 0,
  name: "",
  concentrating: false,
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

  const [lastChange, setLastChange] = useState<HpLastChange | null>(null);
  const [concentrationCheck, setConcentrationCheck] = useState<ConcentrationCheck | null>(null);

  const runTxn = (fn: (r: HpRecord) => HpRecord) =>
    db.transaction("rw", db.hp, async () => {
      const current = (await db.hp.get(HP_ID)) ?? SEED;
      await db.hp.put({ ...fn(current), id: HP_ID });
    });

  // Writes are resilient: a transiently closed/blocked IndexedDB connection (a
  // known mobile quirk after a background service-worker update) would otherwise
  // drop the write silently, so a tap appears to do nothing. Reopen once and
  // retry; if it still fails, surface it instead of failing invisibly. Skip the
  // retry when a reload is imminent (versionchange) so we don't fight it.
  const write = (fn: (r: HpRecord) => HpRecord) => async (): Promise<void> => {
    try {
      await runTxn(fn);
    } catch (err) {
      if (isReloading()) return;
      try {
        if (!db.isOpen()) await db.open();
        await runTxn(fn);
      } catch (err2) {
        console.error("[hoard] HP write failed; the change was not saved", err ?? err2);
      }
    }
  };

  // If the resulting HP is 0, concentration must drop (per 5e AC).
  // Only sets concentrating:false when the record was actually concentrating,
  // avoiding a spurious DB write (and Dexie re-notification) when already false.
  const dropConcentrationIfDown = (r: HpRecord, nextCurrent: number): Pick<HpRecord, "concentrating"> | object =>
    nextCurrent <= 0 && r.concentrating ? { concentrating: false } : {};

  // HP ops run the pure HP function, then reconcile death saves (saves only
  // exist at 0 HP, so any move above 0 clears them) and drop concentration
  // when the character falls to 0.
  const applyHp =
    (op: (s: HpState, n: number) => HpState) => (n: number) => {
      let down = false;
      return write((r) => {
        const hp = op(hpOf(r), n);
        down = hp.current <= 0;
        return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)), ...dropConcentrationIfDown(r, hp.current) };
      })().then(() => {
        // A drop to 0 auto-clears concentration; clear any stale prompt too.
        // Defensive parity with stepHp/setCurrent and AC #1: today no applyHp
        // consumer (setTemp/setMax) can reach <=0 (the domain floors max>=1), so
        // this branch is unreachable in practice — kept uniform across helpers.
        if (down) setConcentrationCheck(null);
      });
    };

  // Pip writes are reconciled against current HP: death saves only exist at 0 HP,
  // so a write while alive is dropped (keeps the invariant; avoids hidden pips).
  const applySaves =
    (op: (ds: DeathSaves, n: number) => DeathSaves) => (n: number) =>
      write((r) => ({ ...r, ...reconcile(r.current, op(savesOf(r), n)) }))();

  // Relative steppers read the *fresh* record inside the transaction, so a burst
  // of ± taps (or hold-to-repeat) accumulates instead of clobbering on stale state.
  // Also drop concentration if the step lands at 0.
  const stepHp =
    (op: (s: HpState, n: number) => HpState, read: (s: HpState) => number) =>
    (delta: number) => {
      let down = false;
      return write((r) => {
        const hp = op(hpOf(r), read(hpOf(r)) + delta);
        down = hp.current <= 0;
        return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)), ...dropConcentrationIfDown(r, hp.current) };
      })().then(() => {
        // A step to 0 auto-clears concentration; clear any stale prompt too.
        if (down) setConcentrationCheck(null);
      });
    };

  // Relative temp stepper — not undoable (the keypad's setTempValue is undoable
  // via the producer in the return object below).
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

  // Run a mutating record-producer through write(), capturing the pre-image of the
  // HP-bearing fields from the SAME fresh transaction record — so rapid taps each
  // snapshot their own correct `before` (no shared stale snapshot).
  const undoable =
    (kind: HpLastChange["kind"], producer: (r: HpRecord, n: number) => HpRecord) =>
    (n: number) => {
      let before: HpLastChange["before"] | null = null;
      return write((r) => {
        before = { current: r.current, temp: r.temp, successes: r.successes, failures: r.failures, concentrating: r.concentrating ?? false };
        return producer(r, n);
      })().then(() => {
        if (before) setLastChange({ kind, amount: n, before });
      });
    };

  // Restore only the HP-bearing fields, so an unrelated change (e.g. hit dice)
  // between the action and the undo is preserved. Clamp the restored current to
  // the current max in case max was lowered after the action was taken.
  const undo = async () => {
    const lc = lastChange;
    if (!lc) return;
    setLastChange(null);
    await write((r) => ({
      ...r,
      ...lc.before,
      current: Math.min(r.max, lc.before.current),
    }))();
  };

  // Dismiss the pill (timeout / next action) without reverting.
  const dismissLastChange = () => setLastChange(null);

  // Dismiss the concentration check prompt without dropping concentration.
  const dismissConcentrationCheck = () => setConcentrationCheck(null);

  // Enable or disable concentration. Enabling at 0 HP is a no-op (per 5e:
  // a downed caster cannot maintain a spell).
  const setConcentrating = (on: boolean) =>
    write((r) => {
      if (on && r.current <= 0) return r; // no-op when down
      return { ...r, concentrating: on };
    })().then(() => {
      // Turning concentration off dismisses any visible check prompt.
      if (!on) setConcentrationCheck(null);
    });

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
    // Existing records (upgraded from v3) may have name === undefined; treat as "".
    name: state.name ?? "",
    concentrating: state.concentrating ?? false,
    concentrationCheck,
    damage: (() => {
      // The damage action is undoable AND may trigger a concentration check.
      // We capture whether the character was concentrating from inside the fresh
      // transaction record (mirrors the `before` snapshot pattern in undoable).
      const kind = "damage" as const;
      return (n: number) => {
        let before: HpLastChange["before"] | null = null;
        let wasConcentrating = false;
        let resultedInDown = false;
        return write((r) => {
          before = { current: r.current, temp: r.temp, successes: r.successes, failures: r.failures, concentrating: r.concentrating ?? false };
          wasConcentrating = r.concentrating ?? false;
          const hp = damage(hpOf(r), n);
          resultedInDown = hp.current <= 0;
          let saves = reconcile(hp.current, savesOf(r));
          if (n > 0 && r.current === 0 && statusFor(r.current, saves) === "dying") {
            saves = addFailure(saves, 1);
          }
          return { ...r, ...hp, ...saves, ...dropConcentrationIfDown(r, hp.current) };
        })().then(() => {
          if (before) setLastChange({ kind, amount: n, before });
          // Show concentration check only when: was concentrating, damage > 0,
          // and the hit didn't drop the character (dropping clears concentration, no save needed).
          if (wasConcentrating && n > 0) {
            if (resultedInDown) {
              // Character dropped to 0 — concentration auto-clears, no save prompt.
              setConcentrationCheck(null);
            } else {
              setConcentrationCheck({ dc: concentrationDC(n), damage: n });
            }
          }
          // If not concentrating, leave any existing check state alone (it was already
          // dismissed or never set).
        });
      };
    })(),
    heal: undoable("heal", (r, n) => {
      const hp = heal(hpOf(r), n);
      return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)) };
    }),
    // setTemp is the domain non-stacking path; not undoable (the keypad uses setTempValue).
    setTemp: applyHp(setTemp),
    setMax: applyHp(setMax),
    setCurrent: (() => {
      // setCurrent is undoable AND may drop the character to 0. On a drop,
      // concentration auto-clears (via dropConcentrationIfDown) and any stale
      // transient prompt must be cleared too (React state, post-write).
      const kind = "set" as const;
      return (n: number) => {
        let before: HpLastChange["before"] | null = null;
        let down = false;
        return write((r) => {
          before = { current: r.current, temp: r.temp, successes: r.successes, failures: r.failures, concentrating: r.concentrating ?? false };
          const hp = setCurrent(hpOf(r), n);
          down = hp.current <= 0;
          return { ...r, ...hp, ...reconcile(hp.current, savesOf(r)), ...dropConcentrationIfDown(r, hp.current) };
        })().then(() => {
          if (before) setLastChange({ kind, amount: n, before });
          if (down) setConcentrationCheck(null);
        });
      };
    })(),
    setSuccesses: applySaves(dsSetSuccesses),
    setFailures: applySaves(dsSetFailures),
    rollDeathSave,
    setTempValue: undoable("temp", (r, n) => ({ ...r, temp: Math.max(0, Math.trunc(n)) })),
    stepCurrent: stepHp(setCurrent, (s) => s.current),
    stepMax: stepHp(setMax, (s) => s.max),
    stepTemp,
    setHitDieSize: setHd<HitDieSize>(setHitDieSize),
    setHitDiceTotal: setHd<number>(setHitDiceTotal),
    setHitDiceAvailable: setHd<number>(setHitDiceAvailable),
    setConMod: setHd<number>(setConMod),
    setName: (s: string) => write((r) => ({ ...r, name: s.trim().slice(0, 24) }))(),
    setConcentrating,
    shortRest,
    // Pass longRest a fresh literal of just the fields it acts on (object literals
    // satisfy RestState's index signature), then spread the recovered fields back
    // onto the full record. Long rest always clears concentration.
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
        concentrating: false,
      }))().then(() => {
        // A long rest ends concentration; clear any lingering prompt too.
        setConcentrationCheck(null);
      }),
    undo,
    dismissLastChange,
    lastChange,
    dismissConcentrationCheck,
  };
}
