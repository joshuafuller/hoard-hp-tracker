import { describe, expect, it } from "vitest";
import { heartbeatBpm } from "./heartbeat";

describe("heartbeatBpm (#220)", () => {
  it("is null when healthy (>50%) — no pulse", () => {
    expect(heartbeatBpm(10, 10)).toBeNull();
    expect(heartbeatBpm(6, 10)).toBeNull(); // 60%
    expect(heartbeatBpm(51, 100)).toBeNull();
  });

  it("is null at 0 or below — the heart has stopped (flatline)", () => {
    expect(heartbeatBpm(0, 10)).toBeNull();
    expect(heartbeatBpm(-3, 10)).toBeNull();
  });

  it("pulses within the danger zone (≤50%, >0)", () => {
    expect(heartbeatBpm(5, 10)).not.toBeNull(); // exactly bloodied
    expect(heartbeatBpm(1, 10)).not.toBeNull();
  });

  it("quickens monotonically as HP falls toward 0", () => {
    const half = heartbeatBpm(5, 10)!;
    const third = heartbeatBpm(3, 10)!;
    const tenth = heartbeatBpm(1, 10)!;
    expect(third).toBeGreaterThan(half);
    expect(tenth).toBeGreaterThan(third);
  });

  it("rests near the bloodied line and races near 0, within a human range", () => {
    expect(heartbeatBpm(5, 10)!).toBeCloseTo(60, 0); // ~resting at half
    expect(heartbeatBpm(1, 1000)!).toBeGreaterThan(120); // near 0 → racing
    expect(heartbeatBpm(1, 1000)!).toBeLessThanOrEqual(150);
  });
});
