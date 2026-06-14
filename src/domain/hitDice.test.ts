import { describe, expect, it } from "vitest";
import {
  restoreHitDice,
  setConMod,
  setHitDiceAvailable,
  setHitDiceTotal,
  setHitDieSize,
  spendHitDie,
  type HitDiceState,
} from "./hitDice";
import type { HpState } from "./hp";

// Invariants that must hold after EVERY hit-dice operation.
function assertInvariants(s: HitDiceState): void {
  expect(s.hitDiceTotal).toBeGreaterThanOrEqual(0);
  expect(s.hitDiceAvailable).toBeGreaterThanOrEqual(0);
  expect(s.hitDiceAvailable).toBeLessThanOrEqual(s.hitDiceTotal);
}

// A frozen input proves purity: any in-place mutation throws in strict mode.
function frozen<T>(s: T): T {
  return Object.freeze({ ...s });
}

// A representative combined state for spendHitDie (HP pools + hit dice).
function combined(
  over: Partial<HpState & HitDiceState> = {},
): HpState & HitDiceState {
  return frozen({
    current: 4,
    max: 10,
    temp: 0,
    hitDieSize: 8,
    hitDiceTotal: 3,
    hitDiceAvailable: 3,
    conMod: 0,
    ...over,
  });
}

describe("setHitDieSize", () => {
  it("sets the die size", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDieSize(s, 12);
    expect(r).toEqual({
      hitDieSize: 12,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDieSize(s, 6);
    expect(s.hitDieSize).toBe(8);
    expect(r).not.toBe(s);
  });
});

describe("setHitDiceTotal", () => {
  it("sets the total", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDiceTotal(s, 5);
    expect(r).toEqual({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    assertInvariants(r);
  });

  it("clamps a negative total up to 0", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDiceTotal(s, -2);
    expect(r).toEqual({
      hitDieSize: 8,
      hitDiceTotal: 0,
      hitDiceAvailable: 0,
      conMod: 0,
    });
    assertInvariants(r);
  });

  it("clamps available down when the new total is lower", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 5,
      conMod: 0,
    });
    const r = setHitDiceTotal(s, 2);
    expect(r).toEqual({
      hitDieSize: 8,
      hitDiceTotal: 2,
      hitDiceAvailable: 2,
      conMod: 0,
    });
    assertInvariants(r);
  });

  it("leaves available unchanged when it still fits under the new total", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 2,
      conMod: 0,
    });
    const r = setHitDiceTotal(s, 8);
    expect(r.hitDiceAvailable).toBe(2);
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 5,
      conMod: 0,
    });
    const r = setHitDiceTotal(s, 2);
    expect(s).toEqual({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 5,
      conMod: 0,
    });
    expect(r).not.toBe(s);
  });
});

describe("setHitDiceAvailable", () => {
  it("sets available within range", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 5,
      conMod: 0,
    });
    const r = setHitDiceAvailable(s, 2);
    expect(r.hitDiceAvailable).toBe(2);
    assertInvariants(r);
  });

  it("clamps above total down to total", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDiceAvailable(s, 100);
    expect(r.hitDiceAvailable).toBe(3);
    assertInvariants(r);
  });

  it("clamps negative up to 0", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDiceAvailable(s, -5);
    expect(r.hitDiceAvailable).toBe(0);
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setHitDiceAvailable(s, 1);
    expect(s.hitDiceAvailable).toBe(3);
    expect(r).not.toBe(s);
  });
});

describe("setConMod", () => {
  it("sets a positive modifier", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setConMod(s, 3);
    expect(r.conMod).toBe(3);
    assertInvariants(r);
  });

  it("sets a negative modifier", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setConMod(s, -2);
    expect(r.conMod).toBe(-2);
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 3,
      hitDiceAvailable: 3,
      conMod: 0,
    });
    const r = setConMod(s, 5);
    expect(s.conMod).toBe(0);
    expect(r).not.toBe(s);
  });
});

describe("spendHitDie", () => {
  it("heals by roll + conMod and decrements available", () => {
    const s = combined({ current: 4, max: 20, conMod: 2, hitDiceAvailable: 3 });
    const r = spendHitDie(s, 5);
    expect(r.current).toBe(11); // 4 + (5 + 2)
    expect(r.hitDiceAvailable).toBe(2);
    assertInvariants(r);
  });

  it("is a no-op when no hit dice are available", () => {
    const s = combined({ current: 4, max: 20, hitDiceAvailable: 0, conMod: 2 });
    const r = spendHitDie(s, 5);
    expect(r).toBe(s); // same reference: nothing happened
    expect(r.current).toBe(4);
    expect(r.hitDiceAvailable).toBe(0);
    assertInvariants(r);
  });

  it("caps healing at max", () => {
    const s = combined({ current: 8, max: 10, conMod: 0, hitDiceAvailable: 2 });
    const r = spendHitDie(s, 100);
    expect(r.current).toBe(10);
    expect(r.hitDiceAvailable).toBe(1);
    assertInvariants(r);
  });

  it("floors a single die's heal at 0 when roll + conMod is negative", () => {
    const s = combined({ current: 6, max: 10, conMod: -5, hitDiceAvailable: 2 });
    const r = spendHitDie(s, 3); // 3 + (-5) = -2 -> floored to 0 heal
    expect(r.current).toBe(6); // unchanged
    expect(r.hitDiceAvailable).toBe(1); // die still spent
    assertInvariants(r);
  });

  it("still spends the die at full HP (heal caps but die is consumed)", () => {
    const s = combined({ current: 10, max: 10, conMod: 2, hitDiceAvailable: 2 });
    const r = spendHitDie(s, 5);
    expect(r.current).toBe(10);
    expect(r.hitDiceAvailable).toBe(1);
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = combined({ current: 4, max: 20, conMod: 2, hitDiceAvailable: 3 });
    const r = spendHitDie(s, 5);
    expect(s.current).toBe(4);
    expect(s.hitDiceAvailable).toBe(3);
    expect(r).not.toBe(s);
  });
});

describe("restoreHitDice", () => {
  it("restores available", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 1,
      conMod: 0,
    });
    const r = restoreHitDice(s, 2);
    expect(r.hitDiceAvailable).toBe(3);
    assertInvariants(r);
  });

  it("caps restored available at total", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 4,
      conMod: 0,
    });
    const r = restoreHitDice(s, 10);
    expect(r.hitDiceAvailable).toBe(5);
    assertInvariants(r);
  });

  it("ignores a negative restore (no-op, never goes negative)", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 2,
      conMod: 0,
    });
    const r = restoreHitDice(s, -3);
    expect(r.hitDiceAvailable).toBe(2);
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen<HitDiceState>({
      hitDieSize: 8,
      hitDiceTotal: 5,
      hitDiceAvailable: 1,
      conMod: 0,
    });
    const r = restoreHitDice(s, 2);
    expect(s.hitDiceAvailable).toBe(1);
    expect(r).not.toBe(s);
  });
});
