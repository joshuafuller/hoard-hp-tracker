/**
 * Radial hub interactions through the real UI (#172) — open, each action (coins /
 * dice / about), the Sound + Concentration toggles reflecting + flipping state, and
 * dismissal (tap-out + Escape). Runs on both mobile viewport projects.
 *
 * The fan chips sit over the WebGL orb canvas, so clicks go via dispatchEvent (the
 * canvas otherwise intercepts Playwright's pointer hit-test — see layout.spec.ts).
 * When closed the fan is inert + aria-hidden, so role/label queries only match it open.
 */
import { test, expect, type Page } from "@playwright/test";

async function openHub(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Actions").click();
  await expect(page.getByRole("button", { name: "About" })).toBeVisible();
}

// Exact match for string names so "Dice" doesn't also hit the "Hit Dice" summary button.
const chip = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" });

test.describe("radial hub (#172)", () => {
  test("the sigil opens the radial menu", async ({ page }) => {
    await openHub(page);
    for (const name of ["Coins", "Dice", "About", "Concentration"]) {
      await expect(chip(page, name)).toBeVisible();
    }
  });

  test("Coins opens the coin sheet", async ({ page }) => {
    await openHub(page);
    await chip(page, "Coins").dispatchEvent("click");
    await expect(page.getByRole("dialog", { name: "Coins" })).toBeVisible();
  });

  test("Dice opens the tray", async ({ page }) => {
    await openHub(page);
    await chip(page, "Dice").dispatchEvent("click");
    await expect(page.getByLabel("Add d20")).toBeVisible();
  });

  test("About opens the About panel with a source link", async ({ page }) => {
    await openHub(page);
    await chip(page, "About").dispatchEvent("click");
    const about = page.getByRole("dialog", { name: "About" });
    await expect(about).toBeVisible();
    await expect(about.getByRole("link", { name: /view source on github/i })).toBeVisible();
  });

  test("the Sound toggle reflects and flips the muted state", async ({ page }) => {
    await openHub(page);
    const sound = chip(page, /Sound|Muted/);
    const before = await sound.getAttribute("aria-pressed");
    await sound.dispatchEvent("click"); // closes the fan
    await page.getByLabel("Actions").click(); // reopen to read the flipped state
    const after = await chip(page, /Sound|Muted/).getAttribute("aria-pressed");
    expect(after).not.toBe(before);
  });

  test("the Concentration toggle reflects and flips", async ({ page }) => {
    await openHub(page);
    expect(await chip(page, "Concentration").getAttribute("aria-pressed")).toBe("false");
    await chip(page, "Concentration").dispatchEvent("click");
    await page.getByLabel("Actions").click();
    expect(await chip(page, "Concentration").getAttribute("aria-pressed")).toBe("true");
  });

  test("tapping outside and pressing Escape close the menu", async ({ page }) => {
    await openHub(page);
    await page.mouse.click(5, 5); // outside the fan
    await expect(chip(page, "About")).toBeHidden();

    await page.getByLabel("Actions").click();
    await expect(chip(page, "About")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(chip(page, "About")).toBeHidden();
  });
});
