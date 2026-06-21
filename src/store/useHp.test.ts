import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHpDb, HP_ID, type HpDb } from "./db";
import { useHp } from "./useHp";

const DB_NAME = "hoard-hp-test";

let db: HpDb;

beforeEach(async () => {
  // Delete via Dexie's captured factory so each test starts from a clean store
  // and the first-run `populate` seed fires deterministically.
  await Dexie.delete(DB_NAME);
  db = createHpDb(DB_NAME);
});

afterEach(() => {
  db.close();
});

describe("createHpDb seeding", () => {
  it("seeds a single 10/10/0 record on first run", async () => {
    const record = await db.hp.get(HP_ID);
    expect(record).toEqual({
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
    });
  });

  it("stores exactly one hp record", async () => {
    const count = await db.hp.count();
    expect(count).toBe(1);
  });
});

describe("createHpDb migration", () => {
  // Fix 5: a legacy record (written before `concentrating` existed) must be
  // backfilled to `false` on upgrade. Assert on the RAW record — the hook masks
  // a missing field with `?? false`, which would hide a missing migration.
  it("backfills concentrating:false on legacy records (v6 -> v7)", async () => {
    // Open the store at v6 (has the rolls table but predates `concentrating`),
    // seed a roll + an hp record with the field absent, then reopen via
    // createHpDb to run the v7 upgrade.
    const legacy = new Dexie(DB_NAME);
    legacy.version(6).stores({ hp: "id", rolls: "++id" });
    await legacy.open();
    await legacy.table("hp").put({
      id: HP_ID,
      current: 7,
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
      // concentrating intentionally omitted (legacy record)
    });
    await legacy.table("rolls").add({ value: 17 });
    legacy.close();

    const upgraded = createHpDb(DB_NAME);
    try {
      const record = await upgraded.hp.get(HP_ID);
      expect(record?.concentrating).toBe(false);
      // Untouched fields survive the upgrade.
      expect(record?.current).toBe(7);
      // The v6 rolls table is preserved (not dropped) by the v7 schema.
      expect(await upgraded.table("rolls").count()).toBe(1);
    } finally {
      upgraded.close();
    }
  });
});

describe("useHp", () => {
  it("exposes the seeded state once loaded", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current).toMatchObject({ current: 10, max: 10, temp: 0 });
  });

  it("damage delegates to the domain and updates reactively", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.damage(3);
    });

    await waitFor(() => expect(result.current.current).toBe(7));
    expect(result.current.temp).toBe(0);
  });

  it("damage applies temp-absorbs-first RAW via the domain", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.setTemp(5);
    });
    await waitFor(() => expect(result.current.temp).toBe(5));

    await act(async () => {
      await result.current.damage(3);
    });
    await waitFor(() => expect(result.current.temp).toBe(2));
    expect(result.current.current).toBe(10);
  });

  it("heal delegates to the domain and never exceeds max", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.damage(6);
    });
    await waitFor(() => expect(result.current.current).toBe(4));

    await act(async () => {
      await result.current.heal(100);
    });
    await waitFor(() => expect(result.current.current).toBe(10));
  });

  it("setMax lowers max and clamps current", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.setMax(5);
    });
    await waitFor(() => expect(result.current.max).toBe(5));
    expect(result.current.current).toBe(5);
  });

  it("setCurrent clamps to range", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.setCurrent(-50);
    });
    await waitFor(() => expect(result.current.current).toBe(0));
  });

  it("serializes rapid concurrent actions without dropping updates", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    // Fire three taps "at once" (a user mashing the button) — each must observe
    // the previous commit, so all three points of damage persist.
    await act(async () => {
      await Promise.all([
        result.current.damage(1),
        result.current.damage(1),
        result.current.damage(1),
      ]);
    });

    await waitFor(() => expect(result.current.current).toBe(7));
  });
});

describe("useHp death saves", () => {
  it("reports status and records pips while down", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.setCurrent(0);
    });
    await waitFor(() => expect(result.current.status).toBe("dying"));

    await act(async () => {
      await result.current.setSuccesses(2);
      await result.current.setFailures(1);
    });
    await waitFor(() => expect(result.current.successes).toBe(2));
    expect(result.current.failures).toBe(1);
    expect(result.current.status).toBe("dying");
  });

  it("becomes dead at three failures", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(3);
    });
    await waitFor(() => expect(result.current.status).toBe("dead"));
  });

  it("damage taken while at 0 HP adds a death-save failure (#58)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
    });
    await waitFor(() => expect(result.current.status).toBe("dying"));

    await act(async () => {
      await result.current.damage(1);
    });
    await waitFor(() => expect(result.current.failures).toBe(1));
    expect(result.current.current).toBe(0);
    expect(result.current.status).toBe("dying");
  });

  it("dropping from above 0 to 0 does NOT add a failure (just starts dying)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.damage(10); // 10 -> 0
    });
    await waitFor(() => expect(result.current.status).toBe("dying"));
    expect(result.current.failures).toBe(0);
  });

  it("a third damage-at-0 failure is fatal", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(2);
    });
    await waitFor(() => expect(result.current.failures).toBe(2));
    await act(async () => {
      await result.current.damage(1);
    });
    await waitFor(() => expect(result.current.status).toBe("dead"));
  });

  it("damage while STABLE at 0 HP does not add a failure (#58 AC)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setSuccesses(3); // stabilized
    });
    await waitFor(() => expect(result.current.status).toBe("stable"));
    await act(async () => {
      await result.current.damage(1);
    });
    await waitFor(() => expect(result.current.failures).toBe(0));
    expect(result.current.status).toBe("stable");
  });

  it("clears death saves on revive (heal above 0)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(2);
    });
    await waitFor(() => expect(result.current.failures).toBe(2));

    await act(async () => {
      await result.current.heal(5);
    });
    await waitFor(() => expect(result.current.status).toBe("alive"));
    expect(result.current.failures).toBe(0);
    expect(result.current.successes).toBe(0);
  });

  it("rollDeathSave applies an injected roll (nat 1 = two failures, nat 20 revives)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
    });
    await waitFor(() => expect(result.current.status).toBe("dying"));

    await act(async () => {
      await result.current.rollDeathSave(1);
    });
    await waitFor(() => expect(result.current.failures).toBe(2));

    await act(async () => {
      await result.current.rollDeathSave(20);
    });
    await waitFor(() => expect(result.current.current).toBe(1));
    expect(result.current.failures).toBe(0);
    expect(result.current.status).toBe("alive");
  });

  it("ignores death-save pip writes while alive (invariant: saves only at 0 HP)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setSuccesses(2);
      await result.current.setFailures(1);
    });
    await waitFor(() => expect(result.current.status).toBe("alive"));
    expect(result.current.successes).toBe(0);
    expect(result.current.failures).toBe(0);
  });

  it("rollDeathSave is a no-op while alive (never drops HP or writes pips)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.rollDeathSave(20);
    });
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.successes).toBe(0);
    expect(result.current.failures).toBe(0);
  });

  it("rollDeathSave is a no-op once dead (a queued roll can't revive a corpse)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(3);
    });
    await waitFor(() => expect(result.current.status).toBe("dead"));
    await act(async () => {
      await result.current.rollDeathSave(20);
    });
    await waitFor(() => expect(result.current.status).toBe("dead"));
    expect(result.current.current).toBe(0);
  });

  it("persists death saves across a fresh connection", async () => {
    const { result, unmount } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(2);
    });
    await waitFor(() => expect(result.current.failures).toBe(2));
    unmount();
    db.close();

    const reopened = createHpDb(DB_NAME);
    try {
      const record = await reopened.hp.get(HP_ID);
      expect(record?.failures).toBe(2);
      expect(record?.current).toBe(0);
    } finally {
      reopened.close();
    }
  });
});

describe("useHp rests", () => {
  it("short rest spends a hit die and heals by roll + CON", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setConMod(2);
      await result.current.setCurrent(4);
    });
    await waitFor(() => expect(result.current.current).toBe(4));

    await act(async () => {
      await result.current.shortRest(3); // injected d8 roll -> heals 3 + 2 = 5
    });
    await waitFor(() => expect(result.current.current).toBe(9));
    expect(result.current.hitDiceAvailable).toBe(0);
  });

  it("short rest is a no-op with no hit dice available", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(4);
      await result.current.setHitDiceAvailable(0);
    });
    await waitFor(() => expect(result.current.hitDiceAvailable).toBe(0));
    await act(async () => {
      await result.current.shortRest(8);
    });
    await waitFor(() => expect(result.current.current).toBe(4));
  });

  it("short rest at 0 HP revives and clears death saves", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setCurrent(0);
      await result.current.setFailures(2);
    });
    await waitFor(() => expect(result.current.status).toBe("dying"));
    await act(async () => {
      await result.current.shortRest(5);
    });
    await waitFor(() => expect(result.current.status).toBe("alive"));
    expect(result.current.current).toBe(5);
    expect(result.current.failures).toBe(0);
  });

  it("long rest fully recovers HP, temp, saves, and half the hit dice", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setHitDiceTotal(4);
      await result.current.setHitDiceAvailable(1);
      await result.current.damage(6);
      await result.current.setTemp(5);
    });
    await waitFor(() => expect(result.current.current).toBe(4));

    await act(async () => {
      await result.current.longRest();
    });
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.temp).toBe(0);
    // regain floor(4/2)=2 -> 1 + 2 = 3, capped at 4.
    expect(result.current.hitDiceAvailable).toBe(3);
  });

  it("persists hit-dice settings", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setHitDieSize(12);
      await result.current.setHitDiceTotal(5);
      await result.current.setConMod(3);
    });
    await waitFor(() => expect(result.current.hitDieSize).toBe(12));
    expect(result.current.hitDiceTotal).toBe(5);
    expect(result.current.conMod).toBe(3);
  });
});

describe("useHp editor steppers", () => {
  it("stepCurrent accumulates rapid taps (no lost updates)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await Promise.all([
        result.current.stepCurrent(-1),
        result.current.stepCurrent(-1),
        result.current.stepCurrent(-1),
      ]);
    });
    await waitFor(() => expect(result.current.current).toBe(7));
  });

  it("stepMax accumulates rapid taps", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.max).toBe(10));
    await act(async () => {
      await Promise.all([result.current.stepMax(1), result.current.stepMax(1)]);
    });
    await waitFor(() => expect(result.current.max).toBe(12));
  });

  it("setTempValue sets an exact lower value (non-stacking setTemp cannot)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setTempValue(5);
    });
    await waitFor(() => expect(result.current.temp).toBe(5));
    await act(async () => {
      await result.current.setTempValue(2);
    });
    await waitFor(() => expect(result.current.temp).toBe(2));
  });

  it("stepTemp lowers temp and floors at 0", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));
    await act(async () => {
      await result.current.setTempValue(2);
      await result.current.stepTemp(-1);
    });
    await waitFor(() => expect(result.current.temp).toBe(1));
    await act(async () => {
      await result.current.stepTemp(-5);
    });
    await waitFor(() => expect(result.current.temp).toBe(0));
  });
});

describe("undo", () => {
  it("reverts the last damage", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(6)); // 10 -> 4
    await waitFor(() => expect(result.current.current).toBe(4));
    expect(result.current.lastChange).toMatchObject({ kind: "damage", amount: 6 });
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.lastChange).toBeNull();
  });

  it("reverts the last heal", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(8)); // 10 -> 2
    await waitFor(() => expect(result.current.current).toBe(2));
    await act(() => result.current.heal(5)); // 2 -> 7
    await waitFor(() => expect(result.current.current).toBe(7));
    await act(() => result.current.undo()); // back to 2
    await waitFor(() => expect(result.current.current).toBe(2));
    expect(result.current.lastChange).toBeNull();
  });

  it("reverts the last temp set", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setTempValue(9));
    await waitFor(() => expect(result.current.temp).toBe(9));
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.temp).toBe(0));
  });

  it("only undoes the most recent action (single level)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(3)); // 10 -> 7
    await act(() => result.current.damage(2)); // 7 -> 5
    await waitFor(() => expect(result.current.current).toBe(5));
    await act(() => result.current.undo()); // 5 -> 7
    await waitFor(() => expect(result.current.current).toBe(7));
    await act(() => result.current.undo()); // no-op, nothing tracked
    await waitFor(() => expect(result.current.current).toBe(7));
  });

  it("is a no-op when nothing has changed", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.lastChange).toBeNull();
    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.current).toBe(10));
  });

  it("clamps the restored current to the current max", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.damage(4)); // 10 -> 6
    await waitFor(() => expect(result.current.current).toBe(6));
    await act(() => result.current.setMax(5)); // max 10 -> 5, current clamps to 5
    await waitFor(() => expect(result.current.max).toBe(5));
    await act(() => result.current.undo()); // before.current was 10; must clamp to new max 5
    await waitFor(() => expect(result.current.current).toBe(5));
  });

  it("snapshots each undoable action from its own transaction (concurrent taps)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    // two damages fired without an intervening render
    await act(async () => { await Promise.all([result.current.damage(2), result.current.damage(3)]); });
    await waitFor(() => expect(result.current.current).toBe(5)); // 10 - 2 - 3
    await act(() => result.current.undo()); // must revert only the LAST applied action (by 3 -> back to 8), not both
    await waitFor(() => expect(result.current.current).toBe(8));
  });
});

describe("persistence across reload", () => {
  it("survives a fresh DB connection to the same store", async () => {
    const { result, unmount } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.current).toBe(10));

    await act(async () => {
      await result.current.damage(4);
      await result.current.setTemp(6);
    });
    await waitFor(() => expect(result.current.current).toBe(6));

    unmount();
    db.close();

    // Simulate a page reload: open a brand-new connection to the same DB name.
    const reopened = createHpDb(DB_NAME);
    try {
      const record = await reopened.hp.get(HP_ID);
      expect(record).toEqual({
        id: HP_ID,
        current: 6,
        max: 10,
        temp: 6,
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
      });
    } finally {
      reopened.close();
    }
  });
});

describe("useHp character name", () => {
  it("exposes an empty name by default", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.name).toBe("");
  });

  it("setName persists a trimmed name", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.setName("  Aria Nighthollow  ");
    });

    await waitFor(() => expect(result.current.name).toBe("Aria Nighthollow"));
  });

  it("setName caps the name at 24 characters", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.setName("A".repeat(30));
    });

    await waitFor(() => expect(result.current.name).toBe("A".repeat(24)));
  });

  it("setName clears the name when given an empty string", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.setName("Gandalf");
    });
    await waitFor(() => expect(result.current.name).toBe("Gandalf"));

    await act(async () => {
      await result.current.setName("");
    });
    await waitFor(() => expect(result.current.name).toBe(""));
  });

  it("setName survives a fresh DB connection (persists)", async () => {
    const { result, unmount } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.setName("Thorn Blackveil");
    });
    await waitFor(() => expect(result.current.name).toBe("Thorn Blackveil"));

    unmount();
    db.close();

    const reopened = createHpDb(DB_NAME);
    try {
      const record = await reopened.hp.get(HP_ID);
      expect(record?.name).toBe("Thorn Blackveil");
    } finally {
      reopened.close();
    }
  });
});

describe("useHp concentration", () => {
  it("starts not concentrating", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.concentrating).toBe(false);
  });

  it("setConcentrating(true) enables concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
  });

  it("setConcentrating(false) drops concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    await act(() => result.current.setConcentrating(false));
    await waitFor(() => expect(result.current.concentrating).toBe(false));
  });

  it("setConcentrating(true) is a no-op when at 0 HP", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setCurrent(0));
    await waitFor(() => expect(result.current.current).toBe(0));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(false));
  });

  it("damage while concentrating sets a concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    // 5 damage from 10 HP -> 5 HP (still alive); DC = max(10, floor(5/2)) = 10
    await act(() => result.current.damage(5));
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());
    expect(result.current.concentrationCheck).toEqual({ dc: 10, damage: 5 });
  });

  it("concentration check DC scales with high damage (22 -> DC 11)", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    // Bump max so 22 damage doesn't drop to 0
    await act(() => result.current.setMax(50));
    await waitFor(() => expect(result.current.max).toBe(50));
    await act(() => result.current.setCurrent(50));
    await waitFor(() => expect(result.current.current).toBe(50));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.damage(22));
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());
    expect(result.current.concentrationCheck?.dc).toBe(11);
  });

  it("damage of 0 while concentrating does NOT set a concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.damage(0));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    expect(result.current.concentrationCheck).toBeNull();
  });

  it("damage while NOT concentrating does not set a concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(() => result.current.damage(5));
    await waitFor(() => expect(result.current.current).toBe(5));
    expect(result.current.concentrationCheck).toBeNull();
  });

  it("dismissConcentrationCheck clears the check without dropping concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    // 3 damage from 10 HP -> 7 HP (stays alive)
    await act(() => result.current.damage(3));
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());

    act(() => result.current.dismissConcentrationCheck());
    expect(result.current.concentrationCheck).toBeNull();
    expect(result.current.concentrating).toBe(true);
  });

  it("dropping to 0 HP clears concentration and sets no check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    // 10 damage drops from 10 to 0
    await act(() => result.current.damage(10));
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrating).toBe(false);
    expect(result.current.concentrationCheck).toBeNull();
  });

  it("long rest clears concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.longRest());
    await waitFor(() => expect(result.current.concentrating).toBe(false));
  });

  it("setCurrent to 0 clears concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.setCurrent(0));
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrating).toBe(false);
  });

  it("heal does not change concentrating state", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    await act(() => result.current.damage(5));
    await waitFor(() => expect(result.current.current).toBe(5));
    await act(() => result.current.heal(3));
    await waitFor(() => expect(result.current.current).toBe(8));
    expect(result.current.concentrating).toBe(true);
  });

  // Fix 1: clearing the transient prompt on down via setCurrent. A lingering
  // prompt (dismissed-but-still-set via a prior hit) must not survive a drop.
  it("setCurrent to 0 clears a pending concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    // Raise a check via a non-lethal hit, then drop to 0 with setCurrent.
    await act(() => result.current.damage(3));
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());

    await act(() => result.current.setCurrent(0));
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrationCheck).toBeNull();
  });

  // Fix 1: clearing the transient prompt on down via stepCurrent.
  it("stepCurrent to 0 clears concentration and a pending check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    await act(() => result.current.damage(3)); // 10 -> 7, raises a check
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());

    await act(() => result.current.stepCurrent(-7)); // 7 -> 0
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrating).toBe(false);
    expect(result.current.concentrationCheck).toBeNull();
  });

  // Fix 2: long rest must also clear the transient prompt, not just the flag.
  it("long rest clears a pending concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    await act(() => result.current.damage(3)); // raises a check
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());

    await act(() => result.current.longRest());
    await waitFor(() => expect(result.current.concentrating).toBe(false));
    expect(result.current.concentrationCheck).toBeNull();
  });

  // Fix 3: turning concentration off should clear any visible prompt.
  it("setConcentrating(false) clears a pending concentration check", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));
    await act(() => result.current.damage(3)); // raises a check, stays alive
    await waitFor(() => expect(result.current.concentrationCheck).not.toBeNull());

    await act(() => result.current.setConcentrating(false));
    await waitFor(() => expect(result.current.concentrating).toBe(false));
    expect(result.current.concentrationCheck).toBeNull();
  });

  // Fix 4: undo after being downed restores the concentrating flag.
  it("undo after being downed restores concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.damage(10)); // 10 -> 0, drops concentration
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrating).toBe(false);

    await act(() => result.current.undo()); // un-down AND re-concentrate
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.concentrating).toBe(true);
  });

  // Fix 4 (setCurrent path): undo restores concentration there too.
  it("undo after setCurrent(0) restores concentration", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.setConcentrating(true));
    await waitFor(() => expect(result.current.concentrating).toBe(true));

    await act(() => result.current.setCurrent(0));
    await waitFor(() => expect(result.current.current).toBe(0));
    expect(result.current.concentrating).toBe(false);

    await act(() => result.current.undo());
    await waitFor(() => expect(result.current.current).toBe(10));
    expect(result.current.concentrating).toBe(true);
  });
});

describe("useHp write durability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects (no silent data loss) when both the txn and the reopen-retry fail", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    // Both the original transaction AND the reopen/retry hit db.hp.put, so a
    // persistent put failure simulates quota/private-mode/blocked-upgrade where
    // the write can never land. The action must surface the failure, not resolve.
    vi.spyOn(db.hp, "put").mockRejectedValue(new Error("QuotaExceededError"));

    await act(async () => {
      await expect(result.current.damage(3)).rejects.toThrow();
    });
  });

  it("does not record the change as undoable when the write fails", async () => {
    const { result } = renderHook(() => useHp(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    vi.spyOn(db.hp, "put").mockRejectedValue(new Error("QuotaExceededError"));

    await act(async () => {
      await expect(result.current.heal(3)).rejects.toThrow();
    });
    // The undo pill must not appear for a write that never persisted.
    expect(result.current.lastChange).toBeNull();
  });
});
