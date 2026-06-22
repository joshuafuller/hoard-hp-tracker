import { describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { rollHeadless, bindTray, type DiceBoxLike } from "./diceEngine";

/**
 * A controllable stand-in for the vendored dice-box. `onRollComplete` is the single
 * callback slot the real engine owns; the test drives it by hand to simulate a
 * physics completion arriving — including a *late* one from a throw the user has
 * already abandoned, which is the race bindTray must defend against.
 */
function fakeBox() {
  const calls = { roll: 0, clear: 0, add: 0 };
  const box: DiceBoxLike = {
    roll: () => { calls.roll++; },
    add: () => { calls.add++; },
    clear: () => { calls.clear++; },
    onRollComplete: () => {},
  };
  return {
    box,
    calls,
    /** Simulate the engine delivering a settle event to its current handler. */
    settle: (results: unknown) => box.onRollComplete(results),
  };
}

// The reconcile path (parser.handleRerolls → recordFromPhysical / parseFinalResults)
// consumes the vendored parser's result format and is exercised by e2e (WebGL). These
// unit tests cover the abandoned-roll GUARD, whose branches all resolve BEFORE any
// reconcile runs — so they never depend on faking the parser's I/O.
describe("bindTray — abandoned-roll race guard (#130 / Codex P2)", () => {
  it("rejects the pending promise and ignores late settles after clear()", async () => {
    const { box, settle, calls } = fakeBox();
    const tray = bindTray(box);
    const p = tray.roll("1d6");
    const onReject = vi.fn();
    const onResolve = vi.fn();
    p.then(onResolve, onReject); // the abandoned throw must settle (reject), not leak

    tray.clear();
    await Promise.resolve();
    await Promise.resolve();
    expect(onReject).toHaveBeenCalled();
    expect(onResolve).not.toHaveBeenCalled();
    expect(calls.clear).toBeGreaterThanOrEqual(1);

    // A late physics event from the swept throw lands while idle — it must be a
    // no-op (no re-resolve, no throw), never resurfacing the abandoned result.
    expect(() => settle({ rolls: [{ rollId: 0, sides: 6, value: 6 }] })).not.toThrow();
    await Promise.resolve();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("a new throw supersedes a still-pending one — the prior promise rejects", async () => {
    const { box } = fakeBox();
    const tray = bindTray(box);
    const first = tray.roll("1d6");
    const firstReject = vi.fn();
    const firstResolve = vi.fn();
    first.then(firstResolve, firstReject);

    tray.roll("1d6"); // supersede before the first settles
    await Promise.resolve();
    await Promise.resolve();
    expect(firstReject).toHaveBeenCalled();
    expect(firstResolve).not.toHaveBeenCalled();
  });

  it("sweeps the table before each throw so a superseded throw's dice can't bleed in", () => {
    const { box, calls } = fakeBox();
    const tray = bindTray(box);
    tray.roll("1d6").catch(() => {}); // superseded below — swallow its rejection
    const afterFirst = calls.clear;
    tray.roll("1d6").catch(() => {});
    expect(calls.clear).toBeGreaterThan(afterFirst);
  });
});

// rollHeadless is the no-physics path (reduced-motion / engine-unavailable): it
// rolls entirely in the parser. Deterministic when given floats (= (value-1)/sides),
// real Math.random otherwise. The animated dice-box path is covered by e2e (WebGL).
describe("rollHeadless", () => {
  it("rolls a plain d20 + modifier deterministically from injected floats", () => {
    const rec = rollHeadless("1d20+5", [(18 - 1) / 20]);
    expect(rec.total).toBe(23);
    expect(rec.result).toEqual([18]);
    expect(rec.dice).toEqual([{ sides: 20, value: 18, dropped: false }]);
  });

  it("advantage keeps the high die, marks the low one dropped", () => {
    const rec = rollHeadless("2d20kh1", [(18 - 1) / 20, (4 - 1) / 20]);
    expect(rec.total).toBe(18);
    expect(rec.result).toEqual([18]);
    expect(rec.dice.filter((d) => d.dropped).map((d) => d.value)).toEqual([4]);
  });

  it("disadvantage keeps the low die", () => {
    const rec = rollHeadless("2d20kl1", [(18 - 1) / 20, (4 - 1) / 20]);
    expect(rec.total).toBe(4);
    expect(rec.result).toEqual([4]);
  });

  it("with no injected floats, produces a valid in-range roll via real RNG", () => {
    for (let i = 0; i < 50; i++) {
      const rec = rollHeadless("1d20");
      expect(rec.dice).toHaveLength(1);
      expect(rec.dice[0]!.sides).toBe(20);
      expect(rec.total).toBeGreaterThanOrEqual(1);
      expect(rec.total).toBeLessThanOrEqual(20);
      expect(rec.result).toEqual([rec.total]);
    }
  });

  it("exploding rolls never tally the total ahead of the dice (total == sum, in range)", () => {
    for (let i = 0; i < 200; i++) {
      const rec = rollHeadless("3d6!");
      const sum = rec.dice.filter((d) => !d.dropped).reduce((a, d) => a + d.value, 0);
      expect(rec.total).toBe(sum); // the total always matches the dice actually shown
      for (const d of rec.dice) {
        expect(d.value).toBeGreaterThanOrEqual(1);
        expect(d.value).toBeLessThanOrEqual(6);
      }
    }
  });

  it("property: every die size stays within [1, sides] (guards the round-overshoot bug)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(4, 6, 8, 10, 12, 20, 100),
        fc.integer({ min: 1, max: 6 }),
        (sides, count) => {
          const rec = rollHeadless(`${count}d${sides}`);
          expect(rec.dice).toHaveLength(count);
          for (const d of rec.dice) {
            expect(d.sides).toBe(sides);
            expect(d.value).toBeGreaterThanOrEqual(1);
            expect(d.value).toBeLessThanOrEqual(sides);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
