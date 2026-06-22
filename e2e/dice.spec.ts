/**
 * Dice tray — user-flow e2e for the roll → result → apply WIRING (#170).
 *
 * SCOPE / BOUNDARY: this runs under `prefers-reduced-motion`, which routes the tray
 * through `rollHeadless` (the parser path) — NO WebGL physics and NO
 * `recordFromPhysical`/`bindTray` reconcile. So a green run here proves the tray's UI
 * wiring (open → type → throw → result renders → Apply changes HP) and close/reopen
 * state safety. It does NOT cover the WebGL reconcile path (the modifier-composition
 * P2s on `dice.ts` — `1d6!p`, `4d6r1!`); that needs a fake `DiceBoxLike` integration
 * test driving `onRollComplete`, tracked separately under #161. Don't read this green
 * as "the real physics path is covered."
 */
import { test, expect } from "@playwright/test";

test.describe("dice tray — roll → result → apply (reduced-motion / headless path)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Reduced-motion settles the hub/tray instantly (reliable clicks) and selects the
    // deterministic headless roll path. See the file header for what this does/doesn't cover.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator(".hp-tracker").waitFor({ state: "visible" });
  });

  // The fan + tray sit over the WebGL orb canvas, which confuses Playwright's pointer
  // hit-test; dispatch the chip click straight to its handler (same workaround as the
  // layout guard).
  async function openTray(page: import("@playwright/test").Page) {
    await page.getByLabel("Actions").click();
    const dice = page.getByRole("button", { name: "Dice", exact: true });
    // Assert the fan actually OPENED (the chip is visible, not inert/aria-hidden)
    // before the dispatch workaround — so a regression where the hub fails to open
    // still fails this test, instead of being masked by dispatchEvent bypassing
    // actionability (Copilot #187). We only bypass the WebGL hit-test false-negative,
    // not the visible/open check.
    await expect(dice).toBeVisible();
    await dice.dispatchEvent("click");
    await page.getByLabel("Dice notation").waitFor({ state: "visible" });
  }

  async function roll(page: import("@playwright/test").Page, expr: string) {
    await page.getByLabel("Dice notation").fill(expr);
    await page.getByRole("button", { name: "Throw", exact: true }).click();
  }

  const hpCurrent = (page: import("@playwright/test").Page) => page.getByTestId("hp-current");
  const readHp = async (page: import("@playwright/test").Page) =>
    Number((await hpCurrent(page).textContent())?.trim());

  test("rolls an ad-hoc expression and applies the total as heal", async ({ page }) => {
    // Damage to 3/10 FIRST — Apply-as-heal clamps at max, so healing from full HP is a
    // vacuous pass (the advisor's gotcha).
    await page.getByLabel("Edit current HP").click();
    const kp = page.getByRole("dialog");
    await kp.getByRole("button", { name: "7", exact: true }).click();
    await kp.getByRole("button", { name: /^damage/i }).click();
    await expect.poll(() => readHp(page)).toBe(3);

    await openTray(page);
    await roll(page, "2d6+3");

    const total = page.locator(".dice-result__total");
    await expect(total).toBeVisible();
    const value = Number((await total.textContent())?.trim());
    expect(value).toBeGreaterThanOrEqual(5); // 2d6+3 min
    expect(value).toBeLessThanOrEqual(15); // 2d6+3 max

    await page.getByRole("button", { name: /apply as heal/i }).click();
    // HP rose by the rolled total, clamped at max (10).
    await expect.poll(() => readHp(page)).toBe(Math.min(10, 3 + value));
  });

  test("an exploding expression resolves to a result without hanging", async ({ page }) => {
    await openTray(page);
    await roll(page, "8d6!");
    // The parser resolves explosions synchronously here; the assertion is that a result
    // renders at all (no hang). The WebGL per-settle truncation guard (#149) is a
    // separate, physics-path concern — not what this proves.
    const total = page.locator(".dice-result__total");
    await expect(total).toBeVisible();
    expect(Number((await total.textContent())?.trim())).toBeGreaterThanOrEqual(8); // 8×d6 min
  });

  test("closing after a result, then reopening, starts clean (no stale dice, no double-apply)", async ({ page }) => {
    const hpBefore = await readHp(page);

    await openTray(page);
    await roll(page, "1d4+1");
    await expect(page.locator(".dice-result__total")).toBeVisible();

    // Closing must NOT apply the roll to HP (only Apply-as-heal does).
    await page.getByLabel("Close dice").click();
    await expect(page.locator(".dice-tray")).toHaveAttribute("data-open", "false");
    expect(await readHp(page)).toBe(hpBefore);

    // Reopening starts clean — no stale result plate carried over, HP untouched.
    await openTray(page);
    await expect(page.locator(".dice-result")).toHaveCount(0);
    expect(await readHp(page)).toBe(hpBefore);
  });
});
