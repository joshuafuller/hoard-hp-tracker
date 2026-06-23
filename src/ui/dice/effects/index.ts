/**
 * Built-in roll effects + the bus factory (#87). Register new effects in
 * `defaultRollEffects` below — DiceTray drives the bus at throw/settle/clear, so a
 * new flourish (nat-1/20 #92 via `onCrit`, burning dice #91 via `onClear`) needs no
 * change to DiceTray or the dice engine. See rollEffects.ts for the interface.
 */
import { playSfx } from "../../../sound/sfx";
import { critEffect } from "./critEffect";
import type { RollEffect } from "./rollEffects";

export { createEffectBus } from "./rollEffects";

/** The dice-clatter cue, expressed as a roll effect (was a direct `playSfx` in DiceTray). */
const clatterEffect: RollEffect = {
  name: "clatter",
  onThrow: (env) => {
    if (!env.muted) playSfx("roll");
  },
};

/** Effects registered on the tray's bus. Append here to add one — no dice-core change. */
export const defaultRollEffects: readonly RollEffect[] = [clatterEffect, critEffect];
