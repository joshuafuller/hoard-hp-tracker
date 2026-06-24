/**
 * Concentration prompt flow (#175): taking damage while concentrating opens the
 * CON-save prompt; Keep preserves concentration, Drop ends it; no prompt when
 * concentration is off. Runs on both mobile viewport projects.
 */
import { test, expect, type Page } from "./fixtures";

async function load(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

const concentrationChip = (page: Page) => page.getByRole("button", { name: "Concentration", exact: true });

async function setConcentrationOn(page: Page) {
  await page.getByLabel("Actions").click();
  const c = concentrationChip(page);
  await expect(c).toBeVisible();
  await c.dispatchEvent("click"); // closes the fan
  // The toggle is an async Dexie write — confirm it ACTUATED before damaging, else the
  // CON-save check may not see concentration on (Copilot/Codex #227). Retrying assertion.
  await page.getByLabel("Actions").click();
  await expect(concentrationChip(page)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
}

// Retrying assertion (not a one-shot read): waits past the async toggle/Dexie write.
async function expectConcentration(page: Page, on: boolean) {
  await page.getByLabel("Actions").click();
  await expect(concentrationChip(page)).toHaveAttribute("aria-pressed", on ? "true" : "false");
  await page.keyboard.press("Escape");
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
    await setConcentrationOn(page);
    await takeDamage(page);
    await expect(keep(page)).toBeVisible();
    await expect(page.getByText(/CON save DC/i)).toBeVisible();
  });

  test("Keep preserves concentration", async ({ page }) => {
    await load(page);
    await setConcentrationOn(page);
    await takeDamage(page);
    await keep(page).click();
    await expect(keep(page)).toBeHidden(); // prompt dismissed
    await expectConcentration(page, true);
  });

  test("Drop ends concentration", async ({ page }) => {
    await load(page);
    await setConcentrationOn(page);
    await takeDamage(page);
    await drop(page).click();
    await expect(drop(page)).toBeHidden();
    await expectConcentration(page, false);
  });

  test("no prompt is shown when concentration is disabled", async ({ page }) => {
    await load(page); // concentration is off by default
    await takeDamage(page);
    await page.waitForSelector(".undo-pill", { state: "visible" }); // damage applied
    await expect(keep(page)).toHaveCount(0);
  });
});
