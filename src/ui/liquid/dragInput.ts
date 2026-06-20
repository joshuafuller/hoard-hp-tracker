/**
 * Pure math for orb-as-input: turn a vertical drag on the orb into an HP change.
 * Drag DOWN (deltaY > 0) drains the vessel → damage; drag UP (deltaY < 0) pours
 * in → heal. Magnitude is proportional to the orb's height so the feel is
 * consistent across screen sizes: dragging a full orb-height applies `max`.
 */
export interface DragApply {
  kind: "damage" | "heal";
  amount: number;
}

/** Below this many px of travel a gesture is a tap (open the keypad), not a drag. */
export const DRAG_TAP_THRESHOLD = 6;

export function dragAmount(deltaY: number, orbPx: number, max: number): DragApply {
  const kind: DragApply["kind"] = deltaY > 0 ? "damage" : "heal";
  if (orbPx <= 0 || max <= 0) return { kind, amount: 0 };
  const fraction = Math.min(1, Math.abs(deltaY) / orbPx);
  return { kind, amount: Math.round(fraction * max) };
}

/** A gesture that moved less than the tap threshold is a tap, not a drag. */
export function isTap(deltaY: number): boolean {
  return Math.abs(deltaY) < DRAG_TAP_THRESHOLD;
}
