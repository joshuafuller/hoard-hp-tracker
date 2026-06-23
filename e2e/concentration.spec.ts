/**
 * Concentration prompt flow (#175): taking damage while concentrating opens the
 * CON-save prompt; Keep preserves concentration, Drop ends it; no prompt when
 * concentration is off. Runs on both mobile viewport projects.
 */
import { test, expect, type Page } from "@playwright/test";

async function load(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function toggleConcentration(page: Page) {
  await page.getByLabel("Actions").click();
  await page.getByRole("button", { name: "Concentration", exact: true }).dispatchEvent("click");
}

async function isConcentrating(page: Page) {
  await page.getByLabel("Actions").click();
  const pressed = await page
    .getByRole("button", { name: "Concentration", exact: true })
    .getAttribute("aria-pressed");
  await page.keyboard.press("Escape"); // close the hub again
  return pressed === "true";
}

async function takeDamage(page: Page) {
  await page.getByLabel("Edit current HP").click();
  const kp = page.getByRole("dialog");
  await kp.getByRole("button", { name: "5", exact: true }).click();
  await kp.getByRole("button", { name: /^damage/i }).click();
}

const keep = (page: Page) => page.getByLabel("Keep concentration");
const drop = (page: Page) => page.getByLabel("Drop concentration");

test.describe("concentration prompt (#175)", () => {
  test("taking damage while concentrating opens the CON-save prompt", async ({ page }) => {
    await load(page);
    await toggleConcentration(page);
    await takeDamage(page);
    await expect(keep(page)).toBeVisible();
    await expect(page.getByText(/CON save DC/i)).toBeVisible();
  });

  test("Keep preserves concentration", async ({ page }) => {
    await load(page);
    await toggleConcentration(page);
    await takeDamage(page);
    await keep(page).click();
    await expect(keep(page)).toBeHidden(); // prompt dismissed
    expect(await isConcentrating(page)).toBe(true);
  });

  test("Drop ends concentration", async ({ page }) => {
    await load(page);
    await toggleConcentration(page);
    await takeDamage(page);
    await drop(page).click();
    await expect(drop(page)).toBeHidden();
    expect(await isConcentrating(page)).toBe(false);
  });

  test("no prompt is shown when concentration is disabled", async ({ page }) => {
    await load(page); // concentration is off by default
    await takeDamage(page);
    await page.waitForSelector(".undo-pill", { state: "visible" }); // damage applied
    await expect(keep(page)).toHaveCount(0);
  });
});
