import { afterEach, describe, expect, it } from "vitest";
import { hasSeenTour, markTourSeen } from "./tour";

const KEY = "hoard-tour-test";

describe("tour persistence (#177)", () => {
  afterEach(() => localStorage.clear());

  it("defaults to not-seen", () => {
    expect(hasSeenTour(KEY)).toBe(false);
  });

  it("persists a seen flag that survives a reload (re-read)", () => {
    markTourSeen(KEY);
    expect(hasSeenTour(KEY)).toBe(true);
    expect(localStorage.getItem(KEY)).toBe("true");
  });

  it("scopes the flag to the key (a different tour is independent)", () => {
    markTourSeen(KEY);
    expect(hasSeenTour("hoard-tour-other")).toBe(false);
  });
});
