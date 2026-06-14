import { describe, expect, it } from "vitest";
import { damage, heal, setCurrent, setMax, setTemp, type HpState } from "./hp";

// Invariants that must hold after EVERY operation (AC: 0<=current<=max, temp>=0, max>=1).
function assertInvariants(s: HpState): void {
  expect(s.max).toBeGreaterThanOrEqual(1);
  expect(s.current).toBeGreaterThanOrEqual(0);
  expect(s.current).toBeLessThanOrEqual(s.max);
  expect(s.temp).toBeGreaterThanOrEqual(0);
}

// A deeply frozen input proves purity: any in-place mutation throws in strict mode.
function frozen(s: HpState): HpState {
  return Object.freeze({ ...s });
}

describe("damage", () => {
  it("reduces current when there is no temp HP", () => {
    const s = frozen({ current: 10, max: 10, temp: 0 });
    const r = damage(s, 3);
    expect(r).toEqual({ current: 7, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("temp HP absorbs damage first (RAW)", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = damage(s, 3);
    expect(r).toEqual({ current: 10, max: 10, temp: 2 });
    assertInvariants(r);
  });

  it("overflow past temp reduces current", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = damage(s, 8);
    expect(r).toEqual({ current: 7, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("floors current at 0 on lethal damage", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = damage(s, 100);
    expect(r).toEqual({ current: 0, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("floors temp at 0 when damage exactly consumes temp", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = damage(s, 5);
    expect(r).toEqual({ current: 10, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("treats negative damage as a no-op", () => {
    const s = frozen({ current: 8, max: 10, temp: 2 });
    const r = damage(s, -5);
    expect(r).toEqual({ current: 8, max: 10, temp: 2 });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = damage(s, 3);
    expect(s).toEqual({ current: 10, max: 10, temp: 5 });
    expect(r).not.toBe(s);
  });
});

describe("heal", () => {
  it("increases current", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = heal(s, 3);
    expect(r).toEqual({ current: 7, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("never exceeds max", () => {
    const s = frozen({ current: 8, max: 10, temp: 0 });
    const r = heal(s, 100);
    expect(r).toEqual({ current: 10, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("never restores temp HP", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = heal(s, 3);
    expect(r.temp).toBe(0);
  });

  it("treats negative healing as a no-op", () => {
    const s = frozen({ current: 8, max: 10, temp: 2 });
    const r = heal(s, -5);
    expect(r).toEqual({ current: 8, max: 10, temp: 2 });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = heal(s, 3);
    expect(s).toEqual({ current: 4, max: 10, temp: 0 });
    expect(r).not.toBe(s);
  });
});

describe("setTemp", () => {
  it("sets temp when higher than current temp", () => {
    const s = frozen({ current: 10, max: 10, temp: 2 });
    const r = setTemp(s, 5);
    expect(r).toEqual({ current: 10, max: 10, temp: 5 });
    assertInvariants(r);
  });

  it("is non-stacking: a lower value is ignored", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = setTemp(s, 3);
    expect(r).toEqual({ current: 10, max: 10, temp: 5 });
    assertInvariants(r);
  });

  it("clears temp when set to 0 (overrides the non-stacking rule)", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = setTemp(s, 0);
    expect(r).toEqual({ current: 10, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("clamps negative input to 0 (clearing temp)", () => {
    const s = frozen({ current: 10, max: 10, temp: 5 });
    const r = setTemp(s, -3);
    expect(r).toEqual({ current: 10, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen({ current: 10, max: 10, temp: 2 });
    const r = setTemp(s, 5);
    expect(s).toEqual({ current: 10, max: 10, temp: 2 });
    expect(r).not.toBe(s);
  });
});

describe("setMax", () => {
  it("raising max leaves current unchanged", () => {
    const s = frozen({ current: 6, max: 10, temp: 0 });
    const r = setMax(s, 20);
    expect(r).toEqual({ current: 6, max: 20, temp: 0 });
    assertInvariants(r);
  });

  it("lowering max clamps current down to the new max", () => {
    const s = frozen({ current: 9, max: 10, temp: 0 });
    const r = setMax(s, 5);
    expect(r).toEqual({ current: 5, max: 5, temp: 0 });
    assertInvariants(r);
  });

  it("leaves temp untouched when max is lowered (temp is a separate pool)", () => {
    const s = frozen({ current: 9, max: 10, temp: 7 });
    const r = setMax(s, 5);
    expect(r.temp).toBe(7);
    assertInvariants(r);
  });

  it("enforces max >= 1, clamping smaller values up to 1", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = setMax(s, 0);
    expect(r).toEqual({ current: 1, max: 1, temp: 0 });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen({ current: 9, max: 10, temp: 0 });
    const r = setMax(s, 5);
    expect(s).toEqual({ current: 9, max: 10, temp: 0 });
    expect(r).not.toBe(s);
  });
});

describe("setCurrent", () => {
  it("sets current within range", () => {
    const s = frozen({ current: 10, max: 10, temp: 0 });
    const r = setCurrent(s, 4);
    expect(r).toEqual({ current: 4, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("clamps to max", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = setCurrent(s, 100);
    expect(r).toEqual({ current: 10, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("clamps to 0", () => {
    const s = frozen({ current: 4, max: 10, temp: 0 });
    const r = setCurrent(s, -100);
    expect(r).toEqual({ current: 0, max: 10, temp: 0 });
    assertInvariants(r);
  });

  it("does not mutate its input", () => {
    const s = frozen({ current: 10, max: 10, temp: 0 });
    const r = setCurrent(s, 4);
    expect(s).toEqual({ current: 10, max: 10, temp: 0 });
    expect(r).not.toBe(s);
  });
});
