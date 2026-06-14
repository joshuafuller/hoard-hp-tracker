import Dexie, { type EntityTable } from "dexie";
import type { HitDieSize } from "../domain/hitDice";

/** Default name for the production HP database. */
export const HP_DB_NAME = "hoard-hp";

/** The single HP record lives at this fixed primary key. */
export const HP_ID = 1 as const;

/** Persisted shape of the one HP record (HP + death saves + Hit Dice + key). */
export interface HpRecord {
  id: number;
  current: number;
  max: number;
  temp: number;
  successes: number;
  failures: number;
  hitDieSize: HitDieSize;
  hitDiceTotal: number;
  hitDiceAvailable: number;
  conMod: number;
}

/** A Dexie database holding exactly one `hp` table. */
export type HpDb = Dexie & {
  hp: EntityTable<HpRecord, "id">;
};

/**
 * Build (and open) an HP database. The first-run seed of `10/10/0` is written
 * via Dexie's `populate` event, which fires only when the database is created —
 * so reopening an existing store never clobbers persisted state.
 *
 * The name is injectable so tests can isolate their own store.
 */
export function createHpDb(name: string = HP_DB_NAME): HpDb {
  const db = new Dexie(name) as HpDb;
  db.version(1).stores({ hp: "id" });
  // v2 adds death saves; only the indexes go in stores(), so the schema string is
  // unchanged. The upgrade backfills existing records with zeroed saves.
  db.version(2)
    .stores({ hp: "id" })
    .upgrade((tx) =>
      tx
        .table<HpRecord, number>("hp")
        .toCollection()
        .modify((r) => {
          r.successes ??= 0;
          r.failures ??= 0;
        }),
    );
  // v3 adds Hit Dice + CON; backfill existing records with sensible defaults.
  db.version(3)
    .stores({ hp: "id" })
    .upgrade((tx) =>
      tx
        .table<HpRecord, number>("hp")
        .toCollection()
        .modify((r) => {
          r.hitDieSize ??= 8;
          r.hitDiceTotal ??= 1;
          r.hitDiceAvailable ??= 1;
          r.conMod ??= 0;
        }),
    );
  // Return the add() promise so the seed write completes inside the populate
  // transaction before the database open resolves (avoids a timing-dependent seed).
  db.on("populate", () =>
    db.hp.add({
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
    }),
  );

  // Resilience for the PWA: if another tab/instance (e.g. a freshly-activated
  // service worker opening a newer DB version) needs to upgrade, our connection
  // would otherwise block and silently swallow every write. Close it so the
  // upgrade can proceed, then reload to reconnect cleanly.
  db.on("versionchange", () => {
    db.close();
    // Reload only in a real browser; jsdom (tests) can't navigate and deleting a
    // DB in a test would otherwise trip "navigation not implemented".
    const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
    if (typeof location !== "undefined" && !isJsdom) {
      try {
        location.reload();
      } catch {
        /* non-browser — nothing to reload */
      }
    }
  });
  db.on("blocked", () => {
    console.warn("[hoard] IndexedDB upgrade is blocked by another open tab");
  });
  return db;
}

/** Shared production database instance. */
export const db: HpDb = createHpDb();
