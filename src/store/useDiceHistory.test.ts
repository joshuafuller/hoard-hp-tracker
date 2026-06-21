import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHpDb, type HpDb } from "./db";
import { DICE_HISTORY_CAP, useDiceHistory } from "./useDiceHistory";
import type { RollRecord } from "../domain/dice";

const DB_NAME = "hoard-hp-dice-test";
let db: HpDb;
beforeEach(async () => {
  await Dexie.delete(DB_NAME);
  db = createHpDb(DB_NAME);
});
afterEach(() => db.close());

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
});
