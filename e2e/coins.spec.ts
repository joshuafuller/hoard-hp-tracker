/**
 * Coin flows through the real UI (#171) — today these are only unit-mocked. Covers
 * the AC: open from the hub, steppers add/spend, the keypad sets an exact value,
 * distill shows a before→after confirm and converts up, undo restores, and the
 * denomination switcher retargets the keypad. Runs on both mobile viewport projects.
 *
 * Reduced-motion is emulated so the radial hub + sheet settle instantly (the fan sits
 * over the WebGL orb canvas, which confuses Playwright's pointer hit-test — same
 * dispatchEvent escape hatch as layout.spec.ts's dice-open).
 */
import { test, expect, type Page } from "./fixtures";

async function openCoins(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Actions").click();
  const coins = page.getByRole("button", { name: "Coins", exact: true });
  await expect(coins).toBeVisible(); // guard: prove the chip is shown before dispatchEvent (Copilot #224)
  await coins.dispatchEvent("click");
  await expect(page.getByRole("dialog", { name: "Coins" })).toBeVisible();
}

// The switcher tab / row-edit button encode the live count in their accessible name,
// e.g. "Gold — 2 gp" (tab) / "Gold — 2 gp, edit" (row), so we assert on those.
const editRow = (page: Page, re: RegExp) => page.getByRole("button", { name: re });

test.describe("coin flows (#171)", () => {
  test("opens the coin sheet from the radial hub and shows the total", async ({ page }) => {
    await openCoins(page);
    await expect(page.getByTestId("coins-total")).toBeVisible();
  });

  test("steppers add and spend a denomination", async ({ page }) => {
    await openCoins(page);
    await page.getByLabel("Add 1 Gold").click();
    await page.getByLabel("Add 1 Gold").click();
    await expect(editRow(page, /Gold — 2 gp, edit/)).toBeVisible();
    await page.getByLabel("Spend 1 Gold").click();
    await expect(editRow(page, /Gold — 1 gp, edit/)).toBeVisible();
  });

  test("the keypad sets a denomination to an exact value", async ({ page }) => {
    await openCoins(page);
    await editRow(page, /Gold — 0 gp, edit/).click(); // opens the retargetable keypad on Gold
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /set to 5/i }).click();
    // keypad stays open (closeOnCommit=false); the Gold switcher tab reflects the new count
    await expect(page.getByRole("group", { name: "Denomination" }).getByRole("button", { name: /Gold — 5 gp/ })).toBeVisible();
  });

  test("distill shows a before→after confirm, converts up, and undo restores", async ({ page }) => {
    await openCoins(page);
    // 10 sp distills up to 1 gp.
    await editRow(page, /Silver — 0 sp, edit/).click();
    await page.getByRole("button", { name: "1", exact: true }).click();
    await page.getByRole("button", { name: "0", exact: true }).click();
    await page.getByRole("button", { name: /set to 10/i }).click();
    const switcher = page.getByRole("group", { name: "Denomination" });
    await expect(switcher.getByRole("button", { name: /Silver — 10 sp/ })).toBeVisible();

    await page.getByRole("button", { name: /distill to fewest coins/i }).click();
    const confirm = page.getByRole("dialog", { name: "Distill coins" });
    await expect(confirm).toBeVisible(); // the before→after diff
    await confirm.getByRole("button", { name: "Distill", exact: true }).click();

    // converted: 10 sp → 1 gp
    await expect(switcher.getByRole("button", { name: /Gold — 1 gp/ })).toBeVisible();
    await expect(switcher.getByRole("button", { name: /Silver — 0 sp/ })).toBeVisible();

    // undo restores the pre-distill purse
    await page.getByRole("button", { name: /undo/i }).click();
    await expect(switcher.getByRole("button", { name: /Silver — 10 sp/ })).toBeVisible();
  });

  test("the denomination switcher retargets the keypad", async ({ page }) => {
    await openCoins(page);
    await editRow(page, /Gold — 0 gp, edit/).click(); // keypad starts on Gold
    const switcher = page.getByRole("group", { name: "Denomination" });
    await switcher.getByRole("button", { name: /Silver — 0 sp/ }).click(); // retarget to Silver
    await page.getByRole("button", { name: "3", exact: true }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(switcher.getByRole("button", { name: /Silver — 3 sp/ })).toBeVisible();
  });
});
