import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MUTE_STORAGE_KEY } from "./soundSettings";

// The engine keeps a module-level AudioContext singleton (correct for prod —
// browsers cap how many you can create). To isolate that singleton between
// tests we reset modules and dynamic-import a fresh copy each time; a static
// import would bind once and leak the cached context across tests.
let playSfx: typeof import("./sfx").playSfx;
let SFX_NAMES: typeof import("./sfx").SFX_NAMES;

/**
 * A minimal fake AudioContext that records the nodes it spawns so tests can
 * assert whether playSfx actually synthesized a tone.
 */
function installFakeAudioContext() {
  const oscillators: FakeOscillator[] = [];
  const gains: FakeGain[] = [];

  class FakeParam {
    value = 0;
    setValueAtTime = vi.fn();
    linearRampToValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
  }

  class FakeOscillator {
    type = "sine";
    frequency = new FakeParam();
    connect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
  }

  class FakeGain {
    gain = new FakeParam();
    connect = vi.fn();
  }

  class FakeAudioContext {
    static instances: FakeAudioContext[] = [];
    currentTime = 0;
    state: "running" | "suspended" = "running";
    destination = {};
    resume = vi.fn(() => {
      this.state = "running";
      return Promise.resolve();
    });
    constructor() {
      FakeAudioContext.instances.push(this);
    }
    createOscillator() {
      const osc = new FakeOscillator();
      oscillators.push(osc);
      return osc;
    }
    createGain() {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    }
  }

  vi.stubGlobal("AudioContext", FakeAudioContext as unknown as typeof AudioContext);
  return { oscillators, gains, FakeAudioContext };
}

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  ({ playSfx, SFX_NAMES } = await import("./sfx"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("playSfx", () => {
  it("synthesizes a tone for a known sound when enabled and AudioContext exists", () => {
    const { oscillators } = installFakeAudioContext();
    playSfx("heal");
    expect(oscillators.length).toBeGreaterThan(0);
    const [first] = oscillators;
    expect(first).toBeDefined();
    expect(first!.start).toHaveBeenCalled();
    expect(first!.stop).toHaveBeenCalled();
  });

  it("plays a tone for every supported sound name", () => {
    const { oscillators } = installFakeAudioContext();
    for (const name of SFX_NAMES) {
      playSfx(name);
    }
    expect(oscillators.length).toBeGreaterThanOrEqual(SFX_NAMES.length);
  });

  it("does not synthesize any tone when sound is muted", () => {
    localStorage.setItem(MUTE_STORAGE_KEY, "true");
    const { oscillators } = installFakeAudioContext();
    playSfx("damage");
    expect(oscillators.length).toBe(0);
  });

  it("is a safe no-op when AudioContext is unavailable", () => {
    // No fake installed: jsdom has no AudioContext; ensure no throw, no effect.
    expect(() => playSfx("death")).not.toThrow();
  });

  it("does not construct an AudioContext on import (no autoplay before a gesture)", async () => {
    const { FakeAudioContext } = installFakeAudioContext();
    vi.resetModules();
    await import("./sfx");
    expect(FakeAudioContext.instances.length).toBe(0);
  });

  it("lazily creates a single shared AudioContext across calls", () => {
    const { FakeAudioContext } = installFakeAudioContext();
    playSfx("step");
    playSfx("roll");
    expect(FakeAudioContext.instances.length).toBe(1);
  });

  it("resumes a suspended AudioContext (autoplay recovery)", () => {
    const { FakeAudioContext } = installFakeAudioContext();
    playSfx("step");
    const ctx = FakeAudioContext.instances[0];
    expect(ctx).toBeDefined();
    ctx!.state = "suspended";
    playSfx("step");
    expect(ctx!.resume).toHaveBeenCalled();
  });

  it("ignores an unknown sound name without throwing", () => {
    const { oscillators } = installFakeAudioContext();
    // @ts-expect-error intentionally passing an unsupported name
    expect(() => playSfx("nonsense")).not.toThrow();
    expect(oscillators.length).toBe(0);
  });
});
