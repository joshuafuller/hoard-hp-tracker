import { useLiveQuery } from "dexie-react-hooks";
import { addCoin, type CoinKind, type Coins, setCoin, spendCoin, totalGp } from "../domain/coins";
import { db as defaultDb, HP_ID, type HpDb, type HpRecord, isReloading } from "./db";

export interface UseCoinsResult extends Coins {
  hydrated: boolean;
  total: number;
  add: (kind: CoinKind, n: number) => Promise<void>;
  spend: (kind: CoinKind, n: number) => Promise<void>;
  set: (kind: CoinKind, n: number) => Promise<void>;
}

const coinsOf = (r: HpRecord): Coins => ({ gp: r.gp ?? 0, sp: r.sp ?? 0, cp: r.cp ?? 0 });

/** Reactive coin state over the single persisted record. Reuses the same resilient
 * read-fresh-inside-txn write the HP hook uses, so rapid taps never clobber. */
export function useCoins(db: HpDb = defaultDb): UseCoinsResult {
  const record = useLiveQuery(() => db.hp.get(HP_ID), [db]);

  const write = (fn: (c: Coins) => Coins) => async (): Promise<void> => {
    const run = () =>
      db.transaction("rw", db.hp, async () => {
        const cur = await db.hp.get(HP_ID);
        if (!cur) return;
        await db.hp.put({ ...cur, ...fn(coinsOf(cur)) });
      });
    try {
      await run();
    } catch (err) {
      if (isReloading()) return;
      try {
        if (!db.isOpen()) await db.open();
        await run();
      } catch (err2) {
        console.error("[hoard] coin write failed; the change was not saved", err ?? err2);
      }
    }
  };

  const coins = record ? coinsOf(record) : { gp: 0, sp: 0, cp: 0 };
  return {
    ...coins,
    total: totalGp(coins),
    hydrated: record !== undefined,
    add: (kind, n) => write((c) => addCoin(c, kind, n))(),
    spend: (kind, n) => write((c) => spendCoin(c, kind, n))(),
    set: (kind, n) => write((c) => setCoin(c, kind, n))(),
  };
}
