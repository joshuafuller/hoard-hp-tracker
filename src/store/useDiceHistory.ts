import { useLiveQuery } from "dexie-react-hooks";
import { db as defaultDb, type DiceRollRecord, type HpDb, type RollContext } from "./db";
import type { RollRecord } from "../domain/dice";

/** Keep only the most recent N rolls — bounds IndexedDB growth across a long session. */
export const DICE_HISTORY_CAP = 50;

export interface UseDiceHistoryResult {
  /** Recent rolls, newest first. */
  rolls: DiceRollRecord[];
  /** True once the live query has resolved (vs. the initial undefined). */
  hydrated: boolean;
  /** Persist a roll. Context defaults to "ad-hoc"; `at` defaults to now (injectable for tests). */
  record: (rec: RollRecord, opts?: { context?: RollContext; at?: number }) => Promise<void>;
  /** Empty the history. */
  clear: () => Promise<void>;
}

/**
 * Reactive dice roll-history over the `rolls` table. Ordering uses the
 * auto-incremented `id` (monotonic == chronological), so it never depends on the
 * wall clock. `record` trims to {@link DICE_HISTORY_CAP} inside its transaction.
 */
export function useDiceHistory(db: HpDb = defaultDb): UseDiceHistoryResult {
  const rolls = useLiveQuery(() => db.rolls.orderBy("id").reverse().toArray(), [db]);

  const record = (rec: RollRecord, opts?: { context?: RollContext; at?: number }) =>
    db.transaction("rw", db.rolls, async () => {
      await db.rolls.add({
        ...rec,
        context: opts?.context ?? "ad-hoc",
        at: opts?.at ?? Date.now(),
      });
      const count = await db.rolls.count();
      if (count > DICE_HISTORY_CAP) {
        const oldest = await db.rolls.orderBy("id").limit(count - DICE_HISTORY_CAP).primaryKeys();
        await db.rolls.bulkDelete(oldest);
      }
    });

  const clear = () => db.rolls.clear();

  return { rolls: rolls ?? [], hydrated: rolls !== undefined, record, clear };
}
