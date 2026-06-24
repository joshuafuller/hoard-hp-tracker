/**
 * Tour engine primitives (#177) — the reusable in-app guided-tour mechanism. The
 * "seen" flag persists like the orb-drag hint so the tour doesn't auto-show again
 * after a player has gone through (or skipped) it. Storage failures are tolerated.
 */

/** One tour step: the element to spotlight + the caption to show. */
export interface TourStep {
  /** CSS selector for the element to spotlight. */
  target: string;
  /** Optional short heading. */
  title?: string;
  /** The caption body. */
  caption: string;
}

/** Read the persisted "seen" flag for a tour, tolerating storage failures (defaults false). */
export function hasSeenTour(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** Persist that a tour has been seen (best-effort; a failed write just won't persist). */
export function markTourSeen(key: string): void {
  try {
    globalThis.localStorage?.setItem(key, "true");
  } catch {
    /* best-effort */
  }
}
