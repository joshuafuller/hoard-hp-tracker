import type { TourStep } from "./tour";

/** localStorage key for the first-run/replay "seen" flag of the main feature tour. */
export const TOUR_KEY = "hoard-tour-seen";

/**
 * The main feature tour (#178): concise, at-the-table copy targeting the real on-screen
 * controls via the #177 engine. Captions stay ≤ ~120 chars and on-brand (DESIGN.md voice).
 * Features behind the radial hub (coins, dice, concentration, sound) are introduced via
 * the hub step; the orb step covers HP, drag-to-edit, and the keypad.
 */
export const TOUR_STEPS: TourStep[] = [
  {
    target: ".vessel__orb",
    title: "Your hit points",
    caption: "Drag the orb up to heal, down to take damage. Tap the number for an exact keypad edit.",
  },
  {
    target: '[aria-label="Actions"]',
    title: "Everything else",
    caption: "Tap the gold sigil to reach coins, the dice tray, concentration, and sound.",
  },
  {
    target: ".rest-controls",
    title: "Rest & recover",
    caption: "Short Rest spends a Hit Die; Long Rest restores you to full. Death saves appear at 0 HP.",
  },
];
