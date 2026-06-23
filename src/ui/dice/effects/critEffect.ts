/**
 * Nat-1 / nat-20 cue (#92), as a roll effect on the #87 `onCrit` hook. The bus only
 * calls `onCrit` for a KEPT d20 showing a nat-1 or nat-20, so this just picks the cue:
 * a celebratory `crit` on a 20, an ominous `fumble` on a 1. Sound respects mute via
 * `env`; the matching visual flourish rides the existing `data-crit` chip (DiceResult).
 */
import type { RollEffect } from "./rollEffects";
import { playSfx } from "../../../sound/sfx";
import { haptic } from "../../../sound/haptics";

export const critEffect: RollEffect = {
  name: "crit",
  onCrit: (die, env) => {
    const nat20 = die.value === 20;
    haptic(nat20 ? "crit" : "fumble"); // felt flourish (self-gates on mute)
    if (env.muted) return;
    playSfx(nat20 ? "crit" : "fumble");
  },
};
