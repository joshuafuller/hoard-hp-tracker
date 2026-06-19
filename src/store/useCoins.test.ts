import "fake-indexeddb/auto";
import Dexie from "dexie";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHpDb, type HpDb } from "./db";
import { useCoins } from "./useCoins";

const DB_NAME = "hoard-hp-coins-test";
let db: HpDb;
beforeEach(async () => { await Dexie.delete(DB_NAME); db = createHpDb(DB_NAME); });
afterEach(() => db.close());

describe("useCoins", () => {
  it("defaults all denominations to 0", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect([result.current.pp, result.current.gp, result.current.sp, result.current.cp]).toEqual([0, 0, 0, 0]);
    expect(result.current.total).toBe(0);
  });

  it("adds, sets, and tracks the gold total", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("gp", 41));
    await act(() => result.current.add("sp", 12));
    await act(() => result.current.add("cp", 30));
    await waitFor(() => expect(result.current.gp).toBe(41));
    expect(result.current.total).toBeCloseTo(42.5, 5);
    await act(() => result.current.set("sp", 7));
    await waitFor(() => expect(result.current.sp).toBe(7));
  });

  it("converts across denominations on spend", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("gp", 1));
    await waitFor(() => expect(result.current.gp).toBe(1));
    // Spend 1 sp from 1 gp → break the gp into 10 sp, leaving 9 sp.
    await act(() => result.current.spend("sp", 1));
    await waitFor(() => expect(result.current.sp).toBe(9));
    expect(result.current.gp).toBe(0);
    expect(result.current.total).toBeCloseTo(0.9, 5);
  });

  it("leaves the purse unchanged when funds are insufficient", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("gp", 3));
    await waitFor(() => expect(result.current.gp).toBe(3));
    await act(() => result.current.spend("gp", 100)); // can't afford → no-op
    await waitFor(() => expect(result.current.gp).toBe(3));
  });

  it("distills the purse into the fewest coins and offers an undo", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("cp", 123));
    await waitFor(() => expect(result.current.cp).toBe(123));

    await act(() => result.current.distill());
    await waitFor(() => expect(result.current.gp).toBe(1));
    expect([result.current.sp, result.current.cp]).toEqual([2, 3]);
    // The pre-distill purse is captured for undo.
    expect(result.current.lastDistill).toEqual({ pp: 0, gp: 0, sp: 0, cp: 123 });

    await act(() => result.current.undoDistill());
    await waitFor(() => expect(result.current.cp).toBe(123));
    expect([result.current.gp, result.current.sp]).toEqual([0, 0]);
    expect(result.current.lastDistill).toBeNull();
  });

  it("drops the distill undo once another coin edit happens", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("cp", 123));
    await waitFor(() => expect(result.current.cp).toBe(123));
    await act(() => result.current.distill());
    await waitFor(() => expect(result.current.lastDistill).not.toBeNull());

    // A later edit invalidates the undo snapshot so it can't clobber the edit.
    await act(() => result.current.add("gp", 1));
    await waitFor(() => expect(result.current.lastDistill).toBeNull());
    await act(() => result.current.undoDistill()); // no-op now
    await waitFor(() => expect(result.current.gp).toBe(2)); // distilled 1 gp + the added 1 gp
  });

  it("does not offer an undo when the purse is already distilled", async () => {
    const { result } = renderHook(() => useCoins(db));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await act(() => result.current.add("gp", 2)); // already minimal
    await waitFor(() => expect(result.current.gp).toBe(2));
    await act(() => result.current.distill());
    await waitFor(() => expect(result.current.gp).toBe(2));
    expect(result.current.lastDistill).toBeNull();
  });
});
