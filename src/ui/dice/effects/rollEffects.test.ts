import { describe, expect, it, vi } from "vitest";
import { createEffectBus, critDice, type EffectEnv, type RollEffect } from "./rollEffects";
import type { RollRecord, RolledDie } from "../../../domain/dice";

const env: EffectEnv = { muted: false, reducedMotion: false };
const rec = (dice: RolledDie[]): RollRecord => ({ notation: "", total: 0, result: [], dice });

describe("createEffectBus (#87)", () => {
  it("fires onThrow and onClear for every registered effect, with the env", () => {
    const a: RollEffect = { name: "a", onThrow: vi.fn(), onClear: vi.fn() };
    const b: RollEffect = { name: "b", onThrow: vi.fn() };
    const bus = createEffectBus([a, b]);
    bus.throw(env);
    expect(a.onThrow).toHaveBeenCalledWith(env);
    expect(b.onThrow).toHaveBeenCalledWith(env);
    bus.clear(env);
    expect(a.onClear).toHaveBeenCalledWith(env);
  });

  it("onSettle runs per effect, then onCrit fires once per kept d20 nat-1/nat-20", () => {
    const e: RollEffect = { name: "e", onSettle: vi.fn(), onCrit: vi.fn() };
    const bus = createEffectBus([e]);
    const record = rec([
      { sides: 20, value: 20, dropped: false },
      { sides: 6, value: 6, dropped: false },
      { sides: 20, value: 1, dropped: false },
    ]);
    bus.settle(record, env);
    expect(e.onSettle).toHaveBeenCalledWith(record, env);
    expect(e.onCrit).toHaveBeenCalledTimes(2);
    expect(e.onCrit).toHaveBeenCalledWith(record.dice[0], env);
    expect(e.onCrit).toHaveBeenCalledWith(record.dice[2], env);
  });

  it("does not fire onCrit for non-d20, non-crit, or dropped dice", () => {
    const e: RollEffect = { name: "e", onCrit: vi.fn() };
    createEffectBus([e]).settle(
      rec([
        { sides: 6, value: 6, dropped: false }, // not a d20
        { sides: 20, value: 15, dropped: false }, // not a crit
        { sides: 20, value: 20, dropped: true }, // crit face but dropped
      ]),
      env,
    );
    expect(e.onCrit).not.toHaveBeenCalled();
  });

  it("isolates a throwing effect so the others still run", () => {
    const boom: RollEffect = { name: "boom", onThrow: () => { throw new Error("x"); } };
    const ok: RollEffect = { name: "ok", onThrow: vi.fn() };
    const bus = createEffectBus([boom, ok]);
    expect(() => bus.throw(env)).not.toThrow();
    expect(ok.onThrow).toHaveBeenCalled();
  });

  it("isolates an ASYNC (rejected-promise) effect too — others still run, no surfaced rejection", async () => {
    const asyncBoom: RollEffect = { name: "asyncBoom", onThrow: (() => Promise.reject(new Error("async x"))) as () => void };
    const ok: RollEffect = { name: "ok", onThrow: vi.fn() };
    const bus = createEffectBus([asyncBoom, ok]);
    expect(() => bus.throw(env)).not.toThrow();
    expect(ok.onThrow).toHaveBeenCalled();
    await Promise.resolve(); // flush microtasks — the rejection is swallowed by the bus
  });

  it("passes env through so effects can self-gate on mute / reduced-motion", () => {
    const e: RollEffect = { name: "e", onThrow: vi.fn() };
    const gated: EffectEnv = { muted: true, reducedMotion: true };
    createEffectBus([e]).throw(gated);
    expect(e.onThrow).toHaveBeenCalledWith(gated);
  });

  it("critDice selects kept d20 nat-1/nat-20 only", () => {
    expect(critDice(rec([{ sides: 20, value: 20, dropped: false }]))).toHaveLength(1);
    expect(critDice(rec([{ sides: 20, value: 1, dropped: false }]))).toHaveLength(1);
    expect(critDice(rec([{ sides: 20, value: 10, dropped: false }]))).toHaveLength(0);
    expect(critDice(rec([{ sides: 12, value: 12, dropped: false }]))).toHaveLength(0);
  });
});
