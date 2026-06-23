import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks: a fake AudioContext + a togglable mute -------------------------
let soundOn = true;
let now = 0;
const oscillators: Array<{ type: string; freq: number }> = [];

function fakeOsc() {
  const o = {
    type: "sine",
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  oscillators.push({ get type() { return o.type; }, get freq() { return 0; } } as never);
  return o;
}
const fakeCtx = {
  get currentTime() { return now; },
  destination: {},
  createOscillator: vi.fn(fakeOsc),
  createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
};

vi.mock("./soundSettings", () => ({ isSoundEnabled: () => soundOn }));
vi.mock("./sfx", async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>);
  return { ...actual, getAudioContext: () => fakeCtx };
});

import { beatIntervalMs, startHeartbeat, stopHeartbeat, updateHeartbeat, HEARTBEAT_VOICES } from "./heartbeatAudio";
import { MAX_CUE_GAIN } from "./sfx";

beforeEach(() => {
  soundOn = true; now = 0; oscillators.length = 0;
  fakeCtx.createOscillator.mockClear();
  vi.useFakeTimers();
});
afterEach(() => { stopHeartbeat(); vi.useRealTimers(); });

describe("heartbeatAudio (#243)", () => {
  it("beatIntervalMs = 60000/bpm", () => {
    expect(beatIntervalMs(60)).toBeCloseTo(1000);
    expect(beatIntervalMs(120)).toBeCloseTo(500);
  });

  it("every lub-dub voice stays within the loudness cap", () => {
    for (const v of HEARTBEAT_VOICES) expect(v.gain).toBeLessThanOrEqual(MAX_CUE_GAIN);
  });

  it("start fires an immediate beat, then repeats at the bpm interval", () => {
    startHeartbeat(60); // 1000ms interval
    const afterFirst = fakeCtx.createOscillator.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0); // immediate beat (lub + dub)
    vi.advanceTimersByTime(1000);
    expect(fakeCtx.createOscillator.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it("is silent while muted (self-gated per beat), audible again when unmuted", () => {
    soundOn = false;
    startHeartbeat(60);
    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(fakeCtx.createOscillator).not.toHaveBeenCalled();
    soundOn = true;
    vi.advanceTimersByTime(1000);
    expect(fakeCtx.createOscillator).toHaveBeenCalled();
  });

  it("stop ends the loop — no further beats", () => {
    startHeartbeat(60);
    stopHeartbeat();
    const n = fakeCtx.createOscillator.mock.calls.length;
    vi.advanceTimersByTime(5000);
    expect(fakeCtx.createOscillator.mock.calls.length).toBe(n);
  });

  it("update changes the rate without stopping", () => {
    startHeartbeat(60);
    stopHeartbeat.length; // noop ref
    updateHeartbeat(120); // now 500ms
    const n = fakeCtx.createOscillator.mock.calls.length;
    vi.advanceTimersByTime(500);
    expect(fakeCtx.createOscillator.mock.calls.length).toBeGreaterThan(n);
  });
});
