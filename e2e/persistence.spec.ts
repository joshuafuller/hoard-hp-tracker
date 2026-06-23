/**
 * Persistence (#173): state survives a full page reload via IndexedDB (Dexie).
 * Each test starts in a fresh browser context (isolated storage), mutates state,
 * reloads, and asserts the value is restored from the database — not in-memory
 * carryover. Runs on both mobile viewport projects.
 */
import { test, expect, type Page } from "@playwright/test";

async function load(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function openCoins(page: Page) {
  await page.getByLabel("Actions").click();
  await page.getByRole("button", { name: "Coins", exact: true }).dispatchEvent("click");
  await expect(page.getByRole("dialog", { name: "Coins" })).toBeVisible();
}

test.describe("persistence across reload (#173)", () => {
  test("current HP is restored after a reload", async ({ page }) => {
    await load(page);
    await page.getByLabel("Edit current HP").click();
    const kp = page.getByRole("dialog");
    await kp.getByRole("button", { name: "5", exact: true }).click();
    await kp.getByRole("button", { name: /^damage/i }).click();
    await page.waitForSelector(".undo-pill", { state: "visible" });
    const readout = page.locator('[aria-label$="hit points"]').first();
    const hp = await readout.getAttribute("aria-label"); // e.g. "5 of 10 hit points"

    await page.reload();
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    // Retrying assertion (not a one-shot read): the shell can paint seeded HP for a tick
    // before Dexie hydrates, so wait until the restored value lands (Copilot/Codex #225).
    await expect(page.locator('[aria-label$="hit points"]').first()).toHaveAttribute("aria-label", hp!);
  });

  test("coins are restored after a reload", async ({ page }) => {
    await load(page);
    await openCoins(page);
    await page.getByLabel("Add 1 Gold").click();
    await page.getByLabel("Add 1 Gold").click();
    await expect(page.getByRole("button", { name: /Gold — 2 gp, edit/ })).toBeVisible();

    await page.reload();
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    await openCoins(page);
    await expect(page.getByRole("button", { name: /Gold — 2 gp, edit/ })).toBeVisible();
  });

  test("concentration is restored after a reload", async ({ page }) => {
    await load(page);
    const concentration = () => page.getByRole("button", { name: "Concentration", exact: true });
    await page.getByLabel("Actions").click();
    await concentration().dispatchEvent("click"); // toggle on (closes the fan)
    // Verify the toggle actually took effect BEFORE reloading (not a no-op) — Copilot #225.
    await page.getByLabel("Actions").click();
    await expect(concentration()).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");

    await page.reload();
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    await page.getByLabel("Actions").click();
    // Retrying assertion so we wait past Dexie hydration rather than reading seeded state.
    await expect(concentration()).toHaveAttribute("aria-pressed", "true");
  });

  test("the character name is restored after a reload", async ({ page }) => {
    await load(page);
    await page.getByRole("button", { name: /name your character/i }).click();
    await page.getByLabel("Character name").fill("Aragorn");
    await page.getByLabel("Character name").press("Enter");
    await expect(page.getByText("Aragorn")).toBeVisible();

    await page.reload();
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    await expect(page.getByText("Aragorn")).toBeVisible();
  });
});
