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
  // Count travel from the tap threshold, not from 0 (#228): otherwise the first deliberate
  // drag past the threshold can round to 0 (dead zone) or skip straight to 2, leaving 1 HP
  // unreachable. Each HP gets an equal share of the remaining orb height; `ceil` makes the
  // very first sliver past the threshold = 1, so the smallest committed drag is always 1 at
  // any max, and the steps then climb 1, 2, 3, … up to `max` at a full orb-height.
  const usable = Math.max(1, orbPx - DRAG_TAP_THRESHOLD);
  const travel = Math.min(usable, Math.abs(deltaY) - DRAG_TAP_THRESHOLD);
  if (travel <= 0) return { kind, amount: 0 }; // a tap — not a committed drag
  return { kind, amount: Math.min(max, Math.max(1, Math.ceil((travel / usable) * max))) };
}

/** A gesture that moved less than the tap threshold is a tap, not a drag. */
export function isTap(deltaY: number): boolean {
  return Math.abs(deltaY) < DRAG_TAP_THRESHOLD;
}
