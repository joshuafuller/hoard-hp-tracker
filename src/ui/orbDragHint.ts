import { useCallback, useState } from "react";

/**
 * The orb is draggable (down = damage, up = heal) but that has no visible
 * affordance, so first-time users miss it (#94). We show a subtle telegraph until
 * the user drags once, then persist a "seen" flag so it never nags again.
 */

/** localStorage key holding the persisted "the drag hint has been dismissed" flag. */
export const ORB_DRAG_HINT_KEY = "hoard-orb-drag-seen";

/** Read the persisted flag, tolerating missing/throwing storage (SSR, private mode). */
function readSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(ORB_DRAG_HINT_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist the flag, silently ignoring storage failures (quota / private mode). */
function writeSeen(): void {
  try {
    globalThis.localStorage?.setItem(ORB_DRAG_HINT_KEY, "true");
  } catch {
    /* best-effort: a failed write just means the hint shows again next session */
  }
}

/**
 * Drives the orb's drag-affordance hint. `seen` is true once the user has dragged
 * the orb (this session or a previous one); `markSeen()` records the first drag and
 * recedes the hint. Call `markSeen` on a committed drag, not a tap.
 */
export function useOrbDragHint(): { seen: boolean; markSeen: () => void } {
  const [seen, setSeen] = useState(readSeen);
  const markSeen = useCallback(() => {
    if (seen) return;
    writeSeen();
    setSeen(true);
  }, [seen]);
  return { seen, markSeen };
}
