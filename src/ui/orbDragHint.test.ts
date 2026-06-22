import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ORB_DRAG_HINT_KEY, useOrbDragHint } from "./orbDragHint";

describe("useOrbDragHint", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("starts unseen with no persisted flag", () => {
    const { result } = renderHook(() => useOrbDragHint());
    expect(result.current.seen).toBe(false);
  });

  it("markSeen flips to seen and persists", () => {
    const { result } = renderHook(() => useOrbDragHint());
    act(() => result.current.markSeen());
    expect(result.current.seen).toBe(true);
    expect(localStorage.getItem(ORB_DRAG_HINT_KEY)).toBe("true");
  });

  it("reads a persisted flag as already seen (no nag next session)", () => {
    localStorage.setItem(ORB_DRAG_HINT_KEY, "true");
    const { result } = renderHook(() => useOrbDragHint());
    expect(result.current.seen).toBe(true);
  });

  it("tolerates a throwing localStorage (private mode) — defaults unseen, no throw", () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("private mode");
    };
    try {
      const { result } = renderHook(() => useOrbDragHint());
      expect(result.current.seen).toBe(false);
      expect(() => act(() => result.current.markSeen())).not.toThrow();
    } finally {
      Storage.prototype.getItem = orig;
    }
  });
});
