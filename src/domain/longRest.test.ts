import { describe, expect, it } from "vitest";
import { longRest, type RestState } from "./longRest";

/** A fully-tracked state (HP + death saves + Hit Dice) for the common cases. */
const full = (over: Partial<RestState> = {}): RestState => ({
  current: 4,
  max: 30,
  temp: 5,
  successes: 2,
  failures: 1,
  hitDiceTotal: 5,
  hitDiceAvailable: 1,
  ...over,
});

describe("longRest", () => {
  it("restores current to max", () => {
    expect(longRest(full({ current: 0 })).current).toBe(30);
  });

  it("clears temporary HP to 0", () => {
    expect(longRest(full({ temp: 12 })).temp).toBe(0);
  });

  it("clears death saves to 0/0", () => {
    const out = longRest(full({ successes: 3, failures: 2 }));
    expect(out.successes).toBe(0);
    expect(out.failures).toBe(0);
  });

  describe("Hit Dice restoration (when tracked)", () => {
    it("regains floor(total/2) on a full pool, capped at total", () => {
      // total 5 → regain 2; available 1 + 2 = 3
      expect(longRest(full({ hitDiceTotal: 5, hitDiceAvailable: 1 }))
        .hitDiceAvailable).toBe(3);
    });

    it("regains at least 1 when floor(total/2) would be 0", () => {
      // total 1 → floor(1/2)=0, min 1 → available 0 + 1 = 1
      expect(longRest(full({ hitDiceTotal: 1, hitDiceAvailable: 0 }))
        .hitDiceAvailable).toBe(1);
    });

    it("caps the regained pool at the total", () => {
      // total 5, available 4 → 4 + 2 = 6, capped at 5
      expect(longRest(full({ hitDiceTotal: 5, hitDiceAvailable: 4 }))
        .hitDiceAvailable).toBe(5);
    });

    it("leaves an already-full pool full", () => {
      expect(longRest(full({ hitDiceTotal: 5, hitDiceAvailable: 5 }))
        .hitDiceAvailable).toBe(5);
    });

    it("regains nothing when there are no Hit Dice at all", () => {
      // total 0 → cap of min(0, …) wins over the min-1 floor
      expect(longRest(full({ hitDiceTotal: 0, hitDiceAvailable: 0 }))
        .hitDiceAvailable).toBe(0);
    });
  });

  describe("works standalone before Hit Dice are tracked", () => {
    it("recovers HP/temp/saves without throwing when HD fields are absent", () => {
      const out = longRest({
        current: 0,
        max: 22,
        temp: 7,
        successes: 1,
        failures: 3,
      });
      expect(out.current).toBe(22);
      expect(out.temp).toBe(0);
      expect(out.successes).toBe(0);
      expect(out.failures).toBe(0);
    });

    it("does not invent Hit Dice fields when none were present", () => {
      const out = longRest({
        current: 0,
        max: 22,
        temp: 7,
        successes: 1,
        failures: 3,
      });
      expect(out).not.toHaveProperty("hitDiceTotal");
      expect(out).not.toHaveProperty("hitDiceAvailable");
    });
  });

  it("preserves unrelated fields and never mutates its input", () => {
    const input = { ...full(), name: "Tordek", note: "knocked out" };
    const out = longRest(input);
    expect(out.name).toBe("Tordek");
    expect(out.note).toBe("knocked out");
    // input is untouched (purity)
    expect(input).toEqual({ ...full(), name: "Tordek", note: "knocked out" });
    // a new object is returned
    expect(out).not.toBe(input);
  });
});
