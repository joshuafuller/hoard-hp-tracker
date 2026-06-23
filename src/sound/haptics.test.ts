import { afterEach, describe, expect, it, vi } from "vitest";
import { canVibrate, haptic, HAPTICS } from "./haptics";

let soundOn = true; // togglable mute, so we can assert haptics stop when muted
vi.mock("./soundSettings", () => ({ isSoundEnabled: () => soundOn }));

function setVibrate(fn: ((p: number | number[]) => boolean) | undefined) {
  if (fn) Object.defineProperty(navigator, "vibrate", { value: fn, configurable: true, writable: true });
  else Reflect.deleteProperty(navigator as object, "vibrate");
}

describe("haptics (#245)", () => {
  afterEach(() => { setVibrate(undefined); soundOn = true; });

  it("does NOT fire when muted (mute silences tactile too) — user intent", () => {
    const v = vi.fn(() => true);
    setVibrate(v);
    soundOn = false;
    haptic("tap");
    haptic("heartbeat");
    expect(v).not.toHaveBeenCalled();
  });

  it("no-ops without throwing where the Vibration API is absent (e.g. iOS)", () => {
    setVibrate(undefined);
    expect(canVibrate()).toBe(false);
    expect(() => haptic("tap")).not.toThrow();
  });

  it("fires the named pattern through navigator.vibrate when supported", () => {
    const v = vi.fn(() => true);
    setVibrate(v);
    expect(canVibrate()).toBe(true);
    haptic("heartbeat");
    expect(v).toHaveBeenCalledWith(HAPTICS.heartbeat);
    haptic("tap");
    expect(v).toHaveBeenCalledWith(10);
  });

  it("the heartbeat pattern is a lub · gap · dub triple", () => {
    expect(HAPTICS.heartbeat).toHaveLength(3);
    const [lub, , dub] = HAPTICS.heartbeat;
    expect(lub).toBeGreaterThan(dub); // S1 stronger than S2
  });

  it("swallows a thrown vibrate (e.g. blocked before a gesture) without crashing", () => {
    setVibrate(() => { throw new Error("blocked"); });
    expect(() => haptic("tap")).not.toThrow();
  });
});
