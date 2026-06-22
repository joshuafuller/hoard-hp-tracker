import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSaveError, reportSaveError, useSaveError } from "./saveError";

describe("saveError signal", () => {
  beforeEach(() => {
    act(() => clearSaveError());
  });

  it("starts false, flips true on report, and clears", () => {
    const { result } = renderHook(() => useSaveError());
    expect(result.current).toBe(false);
    act(() => reportSaveError());
    expect(result.current).toBe(true);
    act(() => clearSaveError());
    expect(result.current).toBe(false);
  });

  it("is idempotent (a second report doesn't toggle off)", () => {
    const { result } = renderHook(() => useSaveError());
    act(() => reportSaveError());
    act(() => reportSaveError());
    expect(result.current).toBe(true);
  });
});
