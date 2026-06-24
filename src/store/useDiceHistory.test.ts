import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHpDb, type DiceRollRecord, type HpDb } from "./db";
import { DICE_HISTORY_CAP, useDiceHistory } from "./useDiceHistory";
import type { RollRecord } from "../domain/dice";

const DB_NAME = "hoard-hp-dice-test";
let db: HpDb;
beforeEach(async () => {
  await Dexie.delete(DB_NAME);
  db = createHpDb(DB_NAME);
});
afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

const rec = (over: Partial<RollRecord> = {}): RollRecord => ({
  notation: "1d20+5",
  total: 23,
  result: [18],
  dice: [{ sides: 20, value: 18, dropped: false }],
  ...over,
});

describe("useDiceHistory", () => {
  it("starts empty and hydrated", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.rolls).toEqual([]);
  });

  it("records a roll with its fields, defaulting context to ad-hoc", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.record(rec(), { at: 1000 }));
    await waitFor(() => expect(result.current.rolls).toHaveLength(1));
    const r = result.current.rolls[0]!;
    expect(r.notation).toBe("1d20+5");
    expect(r.total).toBe(23);
    expect(r.context).toBe("ad-hoc");
    expect(r.at).toBe(1000);
  });

  it("lists rolls newest-first", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.record(rec({ notation: "first" }), { at: 1 }));
    await act(() => result.current.record(rec({ notation: "second" }), { at: 2 }));
    await act(() => result.current.record(rec({ notation: "third" }), { at: 3 }));
    await waitFor(() => expect(result.current.rolls).toHaveLength(3));
    expect(result.current.rolls.map((r) => r.notation)).toEqual(["third", "second", "first"]);
  });

  it("tags the context (death-save / hit-die)", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.record(rec({ notation: "1d20" }), { context: "death-save", at: 5 }));
    await act(() => result.current.record(rec({ notation: "1d8" }), { context: "hit-die", at: 6 }));
    await waitFor(() => expect(result.current.rolls).toHaveLength(2));
    expect(result.current.rolls.map((r) => r.context)).toEqual(["hit-die", "death-save"]);
  });

  it("clears the history", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.record(rec(), { at: 1 }));
    await waitFor(() => expect(result.current.rolls).toHaveLength(1));
    await act(() => result.current.clear());
    await waitFor(() => expect(result.current.rolls).toHaveLength(0));
  });

  it("caps history at DICE_HISTORY_CAP, pruning the oldest", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    for (let i = 1; i <= DICE_HISTORY_CAP + 2; i++) {
      await act(() => result.current.record(rec({ notation: `roll-${i}` }), { at: i }));
    }
    await waitFor(() => expect(result.current.rolls).toHaveLength(DICE_HISTORY_CAP));
    // newest kept, the two oldest pruned
    expect(result.current.rolls[0]!.notation).toBe(`roll-${DICE_HISTORY_CAP + 2}`);
    expect(result.current.rolls.some((r) => r.notation === "roll-1")).toBe(false);
    expect(result.current.rolls.some((r) => r.notation === "roll-2")).toBe(false);
  });

  // #263: the roll-history is a non-essential side log — a persistent write failure is
  // logged once in the store and SWALLOWED (never rejects, never blocks the roll, never
  // raises the shared save-error banner).
  it("swallows a persistent record() failure — resolves, logs once, never throws (#263)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(db, "transaction").mockRejectedValue(new Error("QuotaExceededError"));
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await expect(result.current.record(rec())).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1); // logged in ONE place, not per call site
  });

  it("swallows a persistent clear() failure too — resolves, never throws (#263)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(db.rolls, "clear").mockRejectedValue(new Error("blocked"));
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await expect(result.current.clear()).resolves.toBeUndefined();
  });

  it("retries a record() once after a transient failure, then persists (#263)", async () => {
    const { result } = renderHook(() => useDiceHistory(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    const realAdd = db.rolls.add.bind(db.rolls);
    let calls = 0;
    vi.spyOn(db.rolls, "add").mockImplementation(((item: DiceRollRecord) => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error("transient")) : realAdd(item);
    }) as typeof db.rolls.add);
    await act(async () => {
      await result.current.record(rec({ total: 7 }));
    });
    await waitFor(() => expect(result.current.rolls.some((r) => r.total === 7)).toBe(true));
    expect(calls).toBe(2); // failed once inside the txn, reopen-retried, then succeeded
  });
});
