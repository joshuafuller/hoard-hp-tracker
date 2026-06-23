/**
 * Heartbeat-pulse rate for the orb in the danger zone (#220). Returns beats-per-minute
 * that quicken as HP falls — a resting ~60 bpm at the bloodied line racing to ~150 bpm
 * near death — or `null` when there should be NO pulse: healthy (>50% HP), or down
 * (≤0 HP — the heart has stopped / flatline). Pairs with the bloodied→red orb (#164):
 * the red says *what* (bloodied), the quickening pulse says *how bad*.
 */
import { BLOODIED_AT } from "../hpColor";

/** Resting rate at the bloodied threshold; racing rate as HP approaches 0. */
const REST_BPM = 60;
const MAX_BPM = 150;

/** Beats-per-minute for the orb heartbeat, or `null` for no pulse (healthy or down). */
export function heartbeatBpm(current: number, max: number): number | null {
  if (current <= 0 || max <= 0) return null; // down — the heart has stopped
  const ratio = current / max;
  if (ratio > BLOODIED_AT) return null; // healthy — no pulse above the bloodied line
  const t = 1 - ratio / BLOODIED_AT; // 0 at the bloodied line → 1 as HP → 0
  return REST_BPM + t * (MAX_BPM - REST_BPM);
}
