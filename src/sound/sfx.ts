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
  "toggleOn",
  "toggleOff",
  "undo",
  "coinAdd",
  "coinSpend",
  "coinDistill",
  "down",
  "revive",
  "crit",
  "fumble",
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

/** Peak-gain ceiling — no cue may exceed this, so a play never startles (sound-design.md §4). */
export const MAX_CUE_GAIN = 0.22;

/** The recipe for each cue: one or more short voices. Exported for the loudness guard test. */
export const RECIPES: Record<SfxName, Voice[]> = {
  // Low, blunt thud.
  damage: [{ type: "sawtooth", freq: 150, endFreq: 70, gain: 0.18, duration: 0.18 }],
  // Bright rising two-note lift.
  heal: [
    { type: "sine", freq: 523.25, gain: 0.16, duration: 0.12 },
    { type: "sine", freq: 783.99, gain: 0.16, duration: 0.16, delay: 0.09 },
  ],
  // Soft, quick tick.
  step: [{ type: "triangle", freq: 440, gain: 0.08, duration: 0.05 }],
  // The roll cue is a noise CLATTER (see playClatter) rather than an oscillator —
  // left empty here so playSfx routes "roll" to the clatter path.
  roll: [],
  // Clear, reassuring chime.
  stabilize: [
    { type: "sine", freq: 659.25, gain: 0.16, duration: 0.16 },
    { type: "sine", freq: 987.77, gain: 0.14, duration: 0.22, delay: 0.12 },
  ],
  // A low, slow knell.
  death: [{ type: "sine", freq: 110, endFreq: 65, gain: 0.2, duration: 0.6 }],
  // Down to 0 HP — a short low knell (A2→F2). Gravity, not finality: shorter/higher
  // than death, since death saves begin (sound-design.md §3).
  down: [{ type: "sine", freq: 110, endFreq: 87.31, gain: 0.18, duration: 0.35 }],
  // Revive / back from 0 — a warm rising C5→E5→G5 arpeggio (brighter than heal).
  revive: [
    { type: "sine", freq: 523.25, gain: 0.15, duration: 0.14 },
    { type: "sine", freq: 659.25, gain: 0.15, duration: 0.16, delay: 0.1 },
    { type: "sine", freq: 783.99, gain: 0.16, duration: 0.22, delay: 0.21 },
  ],
  // A gentle warm tone for a short rest.
  shortRest: [{ type: "sine", freq: 392, gain: 0.14, duration: 0.22 }],
  // A fuller rising pair for the sweeping long rest.
  longRest: [
    { type: "sine", freq: 392, gain: 0.14, duration: 0.2 },
    { type: "sine", freq: 587.33, gain: 0.14, duration: 0.3, delay: 0.16 },
  ],
  // Neutral toggle cues — a soft tick UP (C5→E5) for on, DOWN (D5→C5) for off
  // (sound-design.md §3). Light + affirmative; never a jingle.
  toggleOn: [{ type: "triangle", freq: 523.25, endFreq: 659.25, gain: 0.08, duration: 0.06 }],
  toggleOff: [{ type: "triangle", freq: 587.33, endFreq: 523.25, gain: 0.07, duration: 0.06 }],
  // Undo = the neutral tap tone played DESCENDING (A4→E4) — a "rewind" feel.
  undo: [{ type: "triangle", freq: 440, endFreq: 329.63, gain: 0.09, duration: 0.12 }],
  // Coin add/spend are bandpass-noise tick clusters (a metallic clink) — empty
  // recipes; playSfx routes them to playCoinTicks. coinDistill's tumbling ticks come
  // from playCoinCascade, but its settled E6 RING lives here as an oscillator voice
  // so the loudness guard covers it too (Copilot #159).
  coinAdd: [],
  coinSpend: [],
  coinDistill: [{ type: "sine", freq: 1318.51, gain: 0.12, duration: 0.24, delay: 0.33 }],
  // Nat-20 crit (#92): a bright, triumphant rising lift E5→B5→E6 — brighter and
  // higher than `revive`, so a crit reads as celebratory at a glance.
  crit: [
    { type: "sine", freq: 659.25, gain: 0.16, duration: 0.12 },
    { type: "sine", freq: 987.77, gain: 0.16, duration: 0.14, delay: 0.1 },
    { type: "sine", freq: 1318.51, gain: 0.17, duration: 0.22, delay: 0.22 },
  ],
  // Nat-1 fumble (#92): a low descending sawtooth "womp" A3→A2 — ominous/comedic,
  // distinct from the blunt `damage` thud by its longer downward glide.
  fumble: [{ type: "sawtooth", freq: 220, endFreq: 110, gain: 0.16, duration: 0.3 }],
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

/** The shared context IF it already exists AND is running (unlocked by a prior
 *  user-gesture `playSfx`), else null — WITHOUT creating or resuming one. The looping
 *  heartbeat (#243) uses this so it never spins up an AudioContext before a gesture,
 *  honouring the autoplay contract above (Codex #243). */
export function peekAudioContext(): AudioContext | null {
  return ctx && ctx.state === "running" ? ctx : null;
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

/** Shared short white-noise buffer, created once per context for the clatter. */
let noiseBuffer: AudioBuffer | null = null;
function getNoise(context: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === context.sampleRate) return noiseBuffer;
  const len = Math.floor(context.sampleRate * 0.2);
  const buf = context.createBuffer(1, len, context.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** One dice "tick": a band-passed noise burst with a fast attack + short decay. */
function playTick(context: AudioContext, at: number, freq: number, gain: number, duration: number): void {
  const src = context.createBufferSource();
  src.buffer = getNoise(context);
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 1.4;
  const amp = context.createGain();
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  src.connect(band);
  band.connect(amp);
  amp.connect(context.destination);
  src.start(at);
  src.stop(at + duration);
}

/**
 * The dice-clatter cue: a flurry of short noise ticks — dense at the throw, then
 * tapering as the dice settle — to sound like real dice tumbling on a table
 * (rather than a synth tone). Timing/pitch are jittered per roll for variety.
 */
function playClatter(context: AudioContext): void {
  const now = context.currentTime;
  const ticks = 7;
  for (let i = 0; i < ticks; i++) {
    const p = i / (ticks - 1); // 0 → 1 across the clatter
    // Clustered early, scattered late; total span ~0.55s.
    const at = now + p * 0.5 + Math.random() * 0.05;
    const freq = 1600 + Math.random() * 2200; // clicky mid/high band
    const gain = (0.14 - p * 0.08) * (0.8 + Math.random() * 0.4); // taper + jitter
    playTick(context, at, freq, Math.max(0.03, gain), 0.04 + Math.random() * 0.03);
  }
}

/**
 * Coin cue: a short cluster of bright metallic noise ticks (reusing the dice tick
 * generator, retuned higher/cleaner). Pitch rises for a gain ("into the hoard") and
 * falls for a spend ("out") so the two read as mirror transactions. Gains stay well
 * under the 0.22 cue ceiling. — sound-design.md §3 (transactional family).
 */
/** Peak gain of a coin tick — kept under MAX_CUE_GAIN (asserted by the loudness guard). */
export const COIN_TICK_GAIN = 0.11;
function playCoinTicks(context: AudioContext, direction: "add" | "spend"): void {
  const now = context.currentTime;
  const freqs = [2600, 3200, 3900]; // bright metallic band
  if (direction === "spend") freqs.reverse(); // falling lilt for coins out
  freqs.forEach((freq, i) => playTick(context, now + i * 0.06, freq, COIN_TICK_GAIN, 0.05));
}

/**
 * Coin distill: many coins → fewest coins as a "pour that settles" — a short cascade
 * of metallic ticks tumbling DOWN in pitch, resolving on one soft gold ring. Reuses
 * the tick generator + an oscillator ring; all under the gain ceiling.
 * — sound-design.md §3 (transactional).
 */
function playCoinCascade(context: AudioContext): void {
  const now = context.currentTime;
  const ticks = 6;
  for (let i = 0; i < ticks; i++) {
    const p = i / (ticks - 1); // 0 → 1
    const freq = 3700 - p * 1500 + (Math.random() * 200 - 100); // descending, jittered
    playTick(context, now + p * 0.3, freq, COIN_TICK_GAIN * (1 - p * 0.35), 0.05);
  }
  // The settled E6 ring is a RECIPES.coinDistill voice, played by the playSfx routing
  // (so the loudness guard covers it) — not here.
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
    if (name === "roll") {
      playClatter(context); // noise clatter, not an oscillator recipe
      return;
    }
    if (name === "coinAdd" || name === "coinSpend") {
      playCoinTicks(context, name === "coinAdd" ? "add" : "spend");
      return;
    }
    if (name === "coinDistill") {
      playCoinCascade(context); // the tumbling ticks
      for (const voice of recipe) playVoice(context, voice); // the settled ring (guarded)
      return;
    }
    for (const voice of recipe) playVoice(context, voice);
  } catch {
    /* never let an audio glitch break an interaction */
  }
}
