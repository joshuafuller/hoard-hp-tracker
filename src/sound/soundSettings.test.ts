import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSoundEnabled, MUTE_STORAGE_KEY, useSoundEnabled } from "./soundSettings";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("isSoundEnabled", () => {
  it("defaults to enabled (on) when no preference is stored", () => {
    expect(isSoundEnabled()).toBe(true);
  });

  it("returns false when the persisted muted flag is true", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "true");
    expect(isSoundEnabled()).toBe(false);
  });

  it("returns true when the persisted muted flag is false", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "false");
    expect(isSoundEnabled()).toBe(true);
  });

  it("does not throw and stays enabled when localStorage is unavailable", () => {
    const original = globalThis.localStorage;
    // Simulate an environment where localStorage access throws (private mode / SSR).
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("no localStorage");
      },
    });
    try {
      expect(isSoundEnabled()).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});

describe("useSoundEnabled", () => {
  it("starts enabled by default", () => {
    const { result } = renderHook(() => useSoundEnabled());
    expect(result.current[0]).toBe(true);
  });

  it("reflects a persisted muted preference on mount", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "true");
    const { result } = renderHook(() => useSoundEnabled());
    expect(result.current[0]).toBe(false);
  });

  it("toggles enabled state and persists the muted flag", () => {
    const { result } = renderHook(() => useSoundEnabled());

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe("true");

    act(() => {
      result.current[1]();
    });

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(MUTE_STORAGE_KEY)).toBe("false");
  });

  it("keeps isSoundEnabled() in sync with the hook's toggle", () => {
    const { result } = renderHook(() => useSoundEnabled());

    act(() => {
      result.current[1]();
    });

    expect(isSoundEnabled()).toBe(false);
  });
});
