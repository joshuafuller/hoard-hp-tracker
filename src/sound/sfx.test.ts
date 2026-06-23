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
function installFakeAudioContext(opts: { startSuspended?: boolean } = {}) {
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
    state: "running" | "suspended" = opts.startSuspended ? "suspended" : "running";
    destination = {};
    // Async resume (like a real browser): flips to running on a microtask, so a cue
    // scheduled before it resolves would land on the still-suspended clock (#248).
    resume = vi.fn(() => Promise.resolve().then(() => { this.state = "running"; }));
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

  it("defers the first cue until a SUSPENDED context resumes (mobile reload race) — #248", async () => {
    const { oscillators } = installFakeAudioContext({ startSuspended: true });
    playSfx("heal");
    // Must NOT schedule on the frozen/suspended clock (that's the dropped-cue bug)…
    expect(oscillators).toHaveLength(0);
    await new Promise((r) => setTimeout(r, 0)); // flush the resume() microtasks
    // …then render once the context has actually resumed.
    expect(oscillators.length).toBeGreaterThan(0);
  });

  // Bandpass-noise cues (dice clatter + coin clinks) synthesize via BufferSource,
  // not oscillators — they're exercised separately, not in the per-tone count.
  const NOISE_CUES = new Set(["roll", "coinAdd", "coinSpend"]);

  it("plays a tone for every oscillator-based sound name", () => {
    const { oscillators } = installFakeAudioContext();
    const toneCues = SFX_NAMES.filter((n) => !NOISE_CUES.has(n));
    for (const name of toneCues) {
      playSfx(name);
    }
    // Each tone cue must contribute at least one oscillator voice.
    expect(oscillators.length).toBeGreaterThanOrEqual(toneCues.length);
  });

  it("routes coin cues to the noise-tick path (no oscillators)", () => {
    const { oscillators } = installFakeAudioContext();
    expect(() => {
      playSfx("coinAdd");
      playSfx("coinSpend");
    }).not.toThrow();
    expect(oscillators.length).toBe(0);
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

describe("cue loudness guard (sound-design.md §4)", () => {
  it("no cue voice exceeds the peak-gain ceiling, so a play never startles", async () => {
    const { RECIPES, MAX_CUE_GAIN } = await import("./sfx");
    expect(MAX_CUE_GAIN).toBe(0.22);
    for (const [name, voices] of Object.entries(RECIPES)) {
      for (const v of voices) {
        expect(v.gain, `cue "${name}" voice gain ${v.gain} > ceiling`).toBeLessThanOrEqual(MAX_CUE_GAIN);
      }
    }
  });

  it("the noise-tick (coin) cue gain also stays under the ceiling", async () => {
    const { COIN_TICK_GAIN, MAX_CUE_GAIN } = await import("./sfx");
    expect(COIN_TICK_GAIN).toBeLessThanOrEqual(MAX_CUE_GAIN);
  });
});
