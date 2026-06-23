/**
 * The audible heartbeat (#243): a synthesized bass **lub-dub** that loops in time with
 * the orb's heartbeat pulse (#220/#239), quickening as HP nears 0. Unlike the one-shot
 * cues in sfx.ts this is a continuous loop, so it runs its own interval scheduler that
 * fires the two-thump pattern at the beat rate. Each beat self-gates on `isSoundEnabled()`
 * so the mute button silences it instantly; it reuses the shared AudioContext.
 */
import { isSoundEnabled } from "./soundSettings";
import { peekAudioContext } from "./sfx";
import { haptic } from "./haptics";

/** One bass thump: a low sine with a fast pitch-drop kick envelope. */
export interface ThumpVoice {
  freq: number;
  endFreq: number;
  gain: number;
  duration: number;
  /** Offset from the start of the beat (s) — the "dub" lands after the "lub". */
  delay: number;
}

/** The lub-dub: a louder low S1 ("lub") then a softer S2 ("dub") ~0.16s later. Kept
 *  under MAX_CUE_GAIN so it thumps without startling (asserted in the test). */
export const HEARTBEAT_VOICES: readonly ThumpVoice[] = [
  { freq: 62, endFreq: 38, gain: 0.2, duration: 0.16, delay: 0 }, // lub (S1)
  { freq: 50, endFreq: 30, gain: 0.13, duration: 0.13, delay: 0.16 }, // dub (S2)
];

/** Milliseconds between beats for a given bpm. */
export function beatIntervalMs(bpm: number): number {
  return 60000 / Math.max(1, bpm);
}

let timer: ReturnType<typeof setInterval> | null = null;
let currentBpm = 0;
/** Whether the FELT heartbeat is allowed — turned off under reduced motion, where the
 *  audio stays as the motion-free channel (Codex #245). Set by LiquidVessel. */
let hapticsAllowed = true;
export function setHeartbeatHaptics(allowed: boolean): void {
  hapticsAllowed = allowed;
}

/** Schedule one bass thump on the shared context. */
function thump(ctx: AudioContext, v: ThumpVoice): void {
  const t = ctx.currentTime + v.delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(v.freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(v.endFreq, 1), t + v.duration);
  // Fast attack into an exponential decay — a soft kick, no click.
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(v.gain, t + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + v.duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + v.duration);
}

/** Whether we've already logged an audio failure — so a persistent fault warns once,
 *  not on every beat (Copilot #243). */
let warnedOnce = false;

/** Fire one lub-dub. Silent when muted (per-beat gate), or when audio hasn't been
 *  unlocked by a user gesture yet (peekAudioContext returns null — never creates one).
 *  Wrapped defensively: a heartbeat must never crash the orb. */
function fireBeat(): void {
  if (!isSoundEnabled()) return; // mute self-gate (sound AND buzz), checked every beat
  // Felt lub-dub (#245) — a no-op on iOS / unsupported, gated off under reduced motion
  // (the audio stays the motion-free channel). haptic() also self-gates on mute.
  if (hapticsAllowed) haptic("heartbeat");
  try {
    const ctx = peekAudioContext();
    if (!ctx) return; // audio not yet unlocked by a gesture → stay silent
    for (const v of HEARTBEAT_VOICES) thump(ctx, v);
  } catch (err) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn("[hoard] heartbeat audio failed; silencing", err);
    }
  }
}

/** Start (or restart) the looping heartbeat at `bpm` — fires an immediate first beat. */
export function startHeartbeat(bpm: number): void {
  stopHeartbeat();
  currentBpm = bpm;
  fireBeat();
  timer = setInterval(fireBeat, beatIntervalMs(bpm));
}

/** Adjust the rate as HP changes, without missing a beat. Starts if not running. */
export function updateHeartbeat(bpm: number): void {
  if (timer == null) {
    startHeartbeat(bpm);
    return;
  }
  if (bpm === currentBpm) return; // unchanged — keep the beat going (no rounding: stay
  //                                 in step with the visual, which uses the exact bpm)
  currentBpm = bpm;
  clearInterval(timer);
  timer = setInterval(fireBeat, beatIntervalMs(bpm));
}

/** Stop the heartbeat loop (leaving the danger zone, 0 HP, or unmount). */
export function stopHeartbeat(): void {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}
