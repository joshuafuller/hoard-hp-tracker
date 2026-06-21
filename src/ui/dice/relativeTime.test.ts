import { describe, expect, it } from "vitest";
import { relativeTime } from "./relativeTime";

describe("relativeTime", () => {
  it("reads 'just now' for the present and the last few seconds", () => {
    expect(relativeTime(1000, 1000)).toBe("just now");
    expect(relativeTime(0, 30_000)).toBe("just now");
  });

  it("counts minutes (floored, min 1) under an hour", () => {
    expect(relativeTime(0, 50_000)).toBe("1m ago");
    expect(relativeTime(0, 60_000)).toBe("1m ago");
    expect(relativeTime(0, 120_000)).toBe("2m ago");
    expect(relativeTime(0, 59 * 60_000)).toBe("59m ago");
  });

  it("counts hours under a day", () => {
    expect(relativeTime(0, 3_600_000)).toBe("1h ago");
    expect(relativeTime(0, 7_200_000)).toBe("2h ago");
  });

  it("counts days beyond 24h", () => {
    expect(relativeTime(0, 25 * 3_600_000)).toBe("1d ago");
    expect(relativeTime(0, 3 * 86_400_000)).toBe("3d ago");
  });

  it("never goes negative for a future timestamp", () => {
    expect(relativeTime(100, 50)).toBe("just now");
  });
});
