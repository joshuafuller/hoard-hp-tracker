import { beforeEach, describe, expect, it, vi } from "vitest";
import { critEffect } from "./critEffect";
import type { RolledDie } from "../../../domain/dice";
import { playSfx } from "../../../sound/sfx";

vi.mock("../../../sound/sfx", () => ({ playSfx: vi.fn() }));

const d20 = (value: number): RolledDie => ({ sides: 20, value, dropped: false });
const env = (muted = false) => ({ muted, reducedMotion: false });

describe("critEffect (#92)", () => {
  beforeEach(() => vi.mocked(playSfx).mockClear());

  it("plays the celebratory crit cue on a nat 20", () => {
    critEffect.onCrit!(d20(20), env());
    expect(playSfx).toHaveBeenCalledWith("crit");
  });

  it("plays the ominous fumble cue on a nat 1", () => {
    critEffect.onCrit!(d20(1), env());
    expect(playSfx).toHaveBeenCalledWith("fumble");
  });

  it("respects mute — silent when muted", () => {
    critEffect.onCrit!(d20(20), env(true));
    expect(playSfx).not.toHaveBeenCalled();
  });
});
