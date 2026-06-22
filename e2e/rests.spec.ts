/**
 * Regression guard for the rest controls (reported broken). jsdom already covers
 * long rest at the App level, but a real-browser e2e catches layout/overlay
 * regressions jsdom can't — e.g. the always-mounted dice tray covering the footer.
 */
import { test, expect } from "@playwright/test";

const current = (page: import("@playwright/test").Page) => page.locator(".vessel__current");

async function damageTo(page: import("@playwright/test").Page, digit: string) {
  await page.getByLabel("Edit current HP").click();
  const kp = page.getByRole("dialog");
  await kp.getByRole("button", { name: digit, exact: true }).click();
  await kp.getByRole("button", { name: /^damage/i }).click();
}

test.describe("rest controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    await expect(current(page)).toHaveText("10");
  });

  test("Short Rest spends a Hit Die and heals (through the shared dice tray)", async ({ page }) => {
    // Instant-settle dice (no WebGL flake) — Short Rest now routes the Hit Die
    // through the 3D tray (#75 step 5) instead of healing inline.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await damageTo(page, "6"); // 10 → 4
    await expect(current(page)).toHaveText("4");

    const btn = page.getByRole("button", { name: "Short Rest" });
    await expect(btn).toBeEnabled();
    await btn.click();

    // Short Rest opens the tray locked to the Hit Die; throw, then apply the heal.
    const tray = page.getByRole("dialog", { name: "Hit Die roll" });
    await expect(tray).toBeVisible();
    await tray.getByRole("button", { name: /^throw/i }).click();
    await tray.getByRole("button", { name: /apply/i }).click();

    // Heals roll(1..8) + CON(0), capped at max — so current must rise above 4.
    await expect
      .poll(async () => Number(await current(page).textContent()))
      .toBeGreaterThan(4);
  });

  test("Long Rest (with confirm) restores HP to full", async ({ page }) => {
    await damageTo(page, "7"); // 10 → 3
    await expect(current(page)).toHaveText("3");

    await page.getByRole("button", { name: "Long Rest" }).click();
    await page.getByRole("button", { name: "Confirm Long Rest" }).click();
    await expect(current(page)).toHaveText("10");
  });

  test("death save rolls through the shared tray and resolves the rule (#75 step 5)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Drop to 0 → dying → death saves appear (damage 10 via the keypad).
    await page.getByLabel("Edit current HP").click();
    const kp = page.getByRole("dialog", { name: "Apply amount to HP" });
    await kp.getByRole("button", { name: "1", exact: true }).click();
    await kp.getByRole("button", { name: "0", exact: true }).click();
    await kp.getByRole("button", { name: /^damage/i }).click();
    await expect(current(page)).toHaveText("0");

    // Roll Death Save opens the tray locked to the d20; throwing resolves it.
    await page.getByRole("button", { name: /Roll Death Save/i }).click();
    const tray = page.getByRole("dialog", { name: "Death save roll" });
    await expect(tray).toBeVisible();
    await tray.getByRole("button", { name: /^throw/i }).click();
    // The contextual outcome renders (the app applied the rule), then Done closes.
    await expect(tray.getByText(/death save —/i)).toBeVisible();
    await tray.getByRole("button", { name: /done/i }).click();
    await expect(tray).toBeHidden();
  });
});
