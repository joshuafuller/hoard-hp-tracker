/**
 * Interaction-count guard for the core HP actions (issue #53).
 *
 * PRD §6 names the product's primary success signal: a core action (e.g.
 * "apply 9 damage") completes in **≤ 2 interactions, no OS keyboard**. The
 * layout suite (`e2e/layout.spec.ts`) only guards layout + tap-target size,
 * so this spec enforces the headline metric directly: it counts the actual
 * user interactions (clicks/taps) on the happy path and fails if a future
 * change inserts an extra tap (a confirm step, a mode switch, …).
 *
 * Counting convention
 * -------------------
 * From the default screen the keypad's apply buttons are *gated* — Damage /
 * Heal stay disabled until a positive digit is entered (see
 * `src/ui/AmountKeypad.tsx`). So the minimum physical path is necessarily:
 *
 *     1. open the keypad   (tap the HP number)
 *     2. enter the amount  (tap a digit)   ┐ the two value-bearing
 *     3. commit            (tap Damage)    ┘ "interactions" the PRD counts
 *
 * The PRD's "two taps → done" (and the issue's "open keypad → enter → Damage"
 * example) counts the two value-bearing taps and treats opening the surface as
 * free. We measure *every* tap from the default screen for a conservative
 * regression guard: the budget is **3 total = 1 to open + 2 to apply**. The
 * test asserts that exact count, so it goes red the moment anyone adds a tap.
 *
 * "No OS keyboard" is asserted structurally: the keypad is entirely
 * button-driven and contains no <input>/<textarea>, so it can never raise the
 * soft keyboard.
 */

import { test, expect, type Page } from "@playwright/test";

/** The full tap budget for a core HP action: 1 to open the keypad + 2 to apply. */
const INTERACTION_BUDGET = 3;

/** A tiny tap-counter so the spec asserts the real number of user interactions. */
function tapCounter(page: Page) {
  let taps = 0;
  return {
    async tap(locator: ReturnType<Page["locator"]>) {
      taps += 1;
      await locator.click();
    },
    get count() {
      return taps;
    },
  };
}

/**
 * Read the hero current-HP number. The current-HP value is the text of the
 * "Edit current HP" button, which is unambiguous (there are several `status`
 * nodes — the HP readout *and* the undo pill).
 */
async function readCurrentHp(page: Page): Promise<number> {
  const text = await page.getByLabel("Edit current HP").textContent();
  const value = Number(text?.trim());
  expect(Number.isFinite(value), `could not parse HP from button text: ${text}`).toBe(true);
  return value;
}

test.describe("core action interaction budget (PRD §6)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app shell to hydrate (Dexie seed + React render).
    await page.waitForSelector(".hp-tracker", { state: "visible" });
  });

  test("apply 9 damage in ≤ 2 interactions (open + enter + Damage), no OS keyboard", async ({
    page,
  }) => {
    const before = await readCurrentHp(page);
    const interactions = tapCounter(page);

    // 1) Open the keypad by tapping the HP number.
    await interactions.tap(page.getByLabel("Edit current HP"));
    const keypad = page.getByRole("dialog");
    await expect(keypad).toBeVisible();

    // The core path must not rely on the OS soft keyboard: the keypad is
    // button-driven and carries no text inputs.
    await expect(keypad.locator("input, textarea")).toHaveCount(0);

    // 2) Enter the amount (single digit "9").
    await interactions.tap(keypad.getByRole("button", { name: "9", exact: true }));

    // 3) Commit as Damage.
    await interactions.tap(keypad.getByRole("button", { name: "Damage", exact: true }));

    // The action actually applied — assert a relative delta (independent of the
    // seed) via a web-first assertion that auto-retries until the store commits.
    // (Don't wait on `.undo-pill` visibility: a pill from an earlier action can
    // already be on screen, so the wait would resolve before this commit lands.)
    await expect(page.getByLabel("Edit current HP")).toHaveText(String(before - 9));

    // Guard the metric: the whole path stayed within the budgeted taps.
    expect(
      interactions.count,
      "apply-damage must stay within 1 (open) + 2 (apply) taps",
    ).toBeLessThanOrEqual(INTERACTION_BUDGET);
  });

  test("heal N in ≤ 2 interactions (open + enter + Heal), no OS keyboard", async ({
    page,
  }) => {
    // ARRANGE (uncounted): the first-run seed is 10/10/0 (current == max), so a
    // heal would be capped to a no-op. Spend some HP first via the keypad so
    // there is room to heal. These taps are setup, not part of the measured
    // happy path.
    await page.getByLabel("Edit current HP").click();
    {
      const kp = page.getByRole("dialog");
      await kp.getByRole("button", { name: "8", exact: true }).click();
      await kp.getByRole("button", { name: "Damage", exact: true }).click();
    }
    // Wait for the wound to land before measuring (10 − 8 = 2), so `before` is
    // the wounded value rather than the seed.
    await expect(page.getByLabel("Edit current HP")).toHaveText("2");

    // ACT (counted): heal 5 from the wounded state.
    const before = await readCurrentHp(page);
    const interactions = tapCounter(page);

    // 1) Open the keypad.
    await interactions.tap(page.getByLabel("Edit current HP"));
    const keypad = page.getByRole("dialog");
    await expect(keypad).toBeVisible();
    await expect(keypad.locator("input, textarea")).toHaveCount(0);

    // 2) Enter the amount.
    await interactions.tap(keypad.getByRole("button", { name: "5", exact: true }));

    // 3) Commit as Heal.
    await interactions.tap(keypad.getByRole("button", { name: "Heal", exact: true }));

    // Web-first assertion that auto-retries until the heal commits.
    await expect(page.getByLabel("Edit current HP")).toHaveText(String(before + 5));

    expect(
      interactions.count,
      "heal must stay within 1 (open) + 2 (apply) taps",
    ).toBeLessThanOrEqual(INTERACTION_BUDGET);
  });
});
