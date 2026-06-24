import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addCoin,
  type CoinKind,
  type Coins,
  coinsEqual,
  distill as distillCoins,
  setCoin,
  spendCoin,
  totalGp,
} from "../domain/coins";
import { db as defaultDb, HP_ID, type HpDb, type HpRecord, isReloading } from "./db";
import { clearSaveError, reportSaveError } from "./saveError";

export interface UseCoinsResult extends Coins {
  hydrated: boolean;
  total: number;
  add: (kind: CoinKind, n: number) => Promise<void>;
  spend: (kind: CoinKind, n: number) => Promise<void>;
  set: (kind: CoinKind, n: number) => Promise<void>;
  /** Collapse the purse into the fewest coins; captures `lastDistill` for undo when it changes anything. */
  distill: () => Promise<void>;
  /** The pre-distill purse, surfaced so the UI can offer a one-tap undo. Null when there's nothing to undo. */
  lastDistill: Coins | null;
  /** Restore the purse to its pre-distill counts. */
  undoDistill: () => Promise<void>;
  /** Clear the distill-undo affordance without reverting. Synchronous; no DB write. */
  dismissDistill: () => void;
}

const coinsOf = (r: HpRecord): Coins => ({ pp: r.pp ?? 0, gp: r.gp ?? 0, sp: r.sp ?? 0, cp: r.cp ?? 0 });

/** Reactive coin state over the single persisted record. Reuses the same resilient
 * read-fresh-inside-txn write the HP hook uses, so rapid taps never clobber. */
export function useCoins(db: HpDb = defaultDb): UseCoinsResult {
  const record = useLiveQuery(() => db.hp.get(HP_ID), [db]);

  // Ephemeral (like the HP hook's lastChange) — the distill-undo snapshot resets
  // on reload; it isn't persisted.
  const [lastDistill, setLastDistill] = useState<Coins | null>(null);

  const write = (fn: (c: Coins) => Coins) => async (): Promise<void> => {
    const run = () =>
      db.transaction("rw", db.hp, async () => {
        const cur = await db.hp.get(HP_ID);
        // Safe no-op: the record is always seeded on first-run populate (see
        // createHpDb), so a missing record here means the store is mid-init, not
        // lost. Guarding avoids writing a coins-only row with no HP fields.
        if (!cur) return;
        await db.hp.put({ ...cur, ...fn(coinsOf(cur)) });
      });
    try {
      await run();
      clearSaveError(); // a successful write clears any prior save-error banner (#260, symmetric with useHp)
    } catch (err) {
      if (isReloading()) return;
      try {
        if (!db.isOpen()) await db.open();
        await run();
        clearSaveError(); // a successful reopen-retry clears it too (#260)
      } catch (err2) {
        // Both attempts failed (quota, private mode, blocked upgrade). Log the
        // *retry* error (the relevant one) with the original as context, then
        // propagate so callers/UI can react instead of treating it as success
        // (which would be silent data loss).
        console.error("[hoard] coin write failed; the change was not saved", err2, err);
        reportSaveError(); // surface to the UI; no throw — call sites are fire-and-forget (#101)
      }
    }
  };

  // Distill the *fresh* purse inside the transaction. Capture the pre-image for
  // undo only when distilling actually changes the counts (an already-minimal
  // purse is a no-op and offers no undo).
  const distill = () => {
    let before: Coins | null = null;
    return write((c) => {
      const next = distillCoins(c);
      if (!coinsEqual(c, next)) before = c;
      return next;
    })().then(() => {
      if (before) setLastDistill(before);
    });
  };

  // Restore the captured pre-distill counts wholesale (coins are independent of
  // the rest of the record, so a straight overwrite is safe).
  const undoDistill = async () => {
    const snap = lastDistill;
    if (!snap) return;
    setLastDistill(null);
    await write(() => snap)();
  };

  // Any direct edit invalidates the distill-undo snapshot: undoing afterwards
  // would otherwise overwrite the whole purse and silently drop the later edit.
  // So add/spend/set drop the undo first (scopes it to the distill, like HP's
  // lastChange). setLastDistill(null) is a no-op re-render when already null.
  const edit = (fn: (c: Coins) => Coins) => () => {
    setLastDistill(null);
    return write(fn)();
  };

  const coins = record ? coinsOf(record) : { pp: 0, gp: 0, sp: 0, cp: 0 };
  return {
    ...coins,
    total: totalGp(coins),
    hydrated: record !== undefined,
    add: (kind, n) => edit((c) => addCoin(c, kind, n))(),
    spend: (kind, n) => edit((c) => spendCoin(c, kind, n))(),
    set: (kind, n) => edit((c) => setCoin(c, kind, n))(),
    distill,
    lastDistill,
    undoDistill,
    dismissDistill: () => setLastDistill(null),
  };
}
