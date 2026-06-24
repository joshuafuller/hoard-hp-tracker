import { test as base } from "@playwright/test";

/**
 * Shared e2e fixtures.
 *
 * Pre-marks the first-run feature tour (#178) as already-seen via an init script that
 * runs before EVERY navigation, so its full-screen click-blocker (`.tour__block`) never
 * intercepts interactions in these flow specs. The tour auto-shows on a fresh profile,
 * which every e2e run is — without this it would swallow every tap and the flows would
 * time out. The tour has its own unit coverage (`Tour.test.tsx`, `App.test.tsx`); these
 * specs exercise the app *behind* it.
 *
 * The key mirrors `TOUR_KEY` in `src/ui/tourSteps.ts` (kept as a literal to avoid an
 * app-source import from the e2e layer).
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hoard-tour-seen", "true");
      } catch {
        /* storage unavailable — nothing to suppress */
      }
    });
    await use(page);
  },
});

export { expect, type Page } from "@playwright/test";
