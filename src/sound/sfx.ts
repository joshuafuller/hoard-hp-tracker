import { isSoundEnabled } from "./soundSettings";

/**
 * A tiny Web Audio sound engine for the HP tracker (#56).
 *
 * Each cue is a short synthesized tone (oscillator + gain envelope) — no audio
 * assets, no dependencies. Tones complement the existing haptics: a soft tick on
 * a step, a low thud on damage, a bright chime on heal/stabilize, a die-rattle
 * sweep on a roll, a sombre knell on death.
 *
 * Autoplay contract: the AudioContext is created lazily on the first `playSfx`
 * call (which only ever happens from a user gesture) — never at import — and is
 * resumed if the browser left it suspended. Every play is gated on the mute
 * preference, and the whole thing is a safe no-op where AudioContext is missing
 * (jsdom / SSR).
 */

/** The cues the tracker can request. */
export const SFX_NAMES = [
  "damage",
  "heal",
  "step",
  "roll",
  "stabilize",
  "death",
  "shortRest",
  "longRest",
] as const;

export type SfxName = (typeof SFX_NAMES)[number];

/** A single oscillator voice within a cue. */
interface Voice {
  /** Oscillator shape. */
  type: OscillatorType;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency for a pitch glide (e.g. a rattle or a knell). */
  endFreq?: number;
  /** Peak gain (0–1) — kept gentle so cues never startle. */
  gain: number;
  /** Voice length in seconds. */
  duration: number;
  /** Delay before this voice starts, in seconds (for two-note cues). */
  delay?: number;
}

/** The recipe for each cue: one or more short voices. */
const RECIPES: Record<SfxName, Voice[]> = {
  // Low, blunt thud.
  damage: [{ type: "sawtooth", freq: 150, endFreq: 70, gain: 0.18, duration: 0.18 }],
  // Bright rising two-note lift.
  heal: [
    { type: "sine", freq: 523.25, gain: 0.16, duration: 0.12 },
    { type: "sine", freq: 783.99, gain: 0.16, duration: 0.16, delay: 0.09 },
  ],
  // Soft, quick tick.
  step: [{ type: "triangle", freq: 440, gain: 0.08, duration: 0.05 }],
  // A quick descending rattle to suggest a tumbling die.
  roll: [{ type: "square", freq: 880, endFreq: 220, gain: 0.1, duration: 0.22 }],
  // Clear, reassuring chime.
  stabilize: [
    { type: "sine", freq: 659.25, gain: 0.16, duration: 0.16 },
    { type: "sine", freq: 987.77, gain: 0.14, duration: 0.22, delay: 0.12 },
  ],
  // A low, slow knell.
  death: [{ type: "sine", freq: 110, endFreq: 65, gain: 0.2, duration: 0.6 }],
  // A gentle warm tone for a short rest.
  shortRest: [{ type: "sine", freq: 392, gain: 0.14, duration: 0.22 }],
  // A fuller rising pair for the sweeping long rest.
  longRest: [
    { type: "sine", freq: 392, gain: 0.14, duration: 0.2 },
    { type: "sine", freq: 587.33, gain: 0.14, duration: 0.3, delay: 0.16 },
  ],
};

/** The lazily-created, shared AudioContext (null until the first real play). */
let ctx: AudioContext | null = null;

/** Resolve the AudioContext constructor across browsers, or undefined if absent. */
function getAudioContextCtor(): typeof AudioContext | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * Get the shared AudioContext, creating it on first use and resuming it if the
 * browser suspended it (autoplay policy). Returns null where unsupported.
 */
function ensureContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Schedule one oscillator voice on the context. */
function playVoice(context: AudioContext, voice: Voice): void {
  const start = context.currentTime + (voice.delay ?? 0);
  const end = start + voice.duration;

  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = voice.type;
  osc.frequency.setValueAtTime(voice.freq, start);
  if (voice.endFreq != null) {
    // exponentialRamp needs a non-zero target; clamp just in case.
    osc.frequency.exponentialRampToValueAtTime(Math.max(voice.endFreq, 1), end);
  }

  // A fast attack into an exponential decay — short and unobtrusive.
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(voice.gain, start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(amp);
  amp.connect(context.destination);
  osc.start(start);
  osc.stop(end);
}

/**
 * Play a sound cue by name. No-ops silently when muted, when the name is
 * unknown, or when Web Audio is unavailable.
 */
export function playSfx(name: SfxName): void {
  if (!isSoundEnabled()) return;
  const recipe = RECIPES[name];
  if (!recipe) return;
  const context = ensureContext();
  if (!context) return;
  try {
    for (const voice of recipe) playVoice(context, voice);
  } catch {
    /* never let an audio glitch break an interaction */
  }
}
