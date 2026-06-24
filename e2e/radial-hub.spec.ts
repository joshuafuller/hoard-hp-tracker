/**
 * Radial hub interactions through the real UI (#172) — open, each action (coins /
 * dice / about), the Sound + Concentration toggles reflecting + flipping state, and
 * dismissal (tap-out + Escape). Runs on both mobile viewport projects.
 *
 * The fan chips sit over the WebGL orb canvas, so clicks go via dispatchEvent (the
 * canvas otherwise intercepts Playwright's pointer hit-test — see layout.spec.ts).
 * When closed the fan is inert + aria-hidden, so role/label queries only match it open.
 */
import { test, expect, type Page } from "./fixtures";

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

// dispatchEvent fires the handler regardless of actionability, so assert the chip is actually
// VISIBLE first — an inert / aria-hidden / closed chip then fails the test instead of silently
// passing (Copilot #224). Real .click() isn't usable here: the WebGL canvas intercepts the
// pointer hit-test (see layout.spec.ts).
async function clickChip(page: Page, name: string | RegExp) {
  const c = chip(page, name);
  await expect(c).toBeVisible();
  await c.dispatchEvent("click");
}

test.describe("radial hub (#172)", () => {
  test("the sigil opens the radial menu", async ({ page }) => {
    await openHub(page);
    for (const name of ["Coins", "Dice", "About", "Concentration"]) {
      await expect(chip(page, name)).toBeVisible();
    }
  });

  test("Coins opens the coin sheet", async ({ page }) => {
    await openHub(page);
    await clickChip(page, "Coins");
    await expect(page.getByRole("dialog", { name: "Coins" })).toBeVisible();
  });

  test("Dice opens the tray", async ({ page }) => {
    await openHub(page);
    await clickChip(page, "Dice");
    await expect(page.getByLabel("Add d20")).toBeVisible();
  });

  test("About opens the About panel with a source link", async ({ page }) => {
    await openHub(page);
    await clickChip(page, "About");
    const about = page.getByRole("dialog", { name: "About" });
    await expect(about).toBeVisible();
    await expect(about.getByRole("link", { name: /view source on github/i })).toBeVisible();
  });

  test("the About close (✕) is at least a 44px tap target (#238)", async ({ page }) => {
    await openHub(page);
    await clickChip(page, "About");
    const close = page.getByRole("dialog", { name: "About" }).getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    // The shared ghost IconButton is 36px; the corner-tucked close must restore the
    // 44px minimum tap target so it isn't fiddly to hit (#238).
    const box = await close.boundingBox();
    if (!box) throw new Error("close button has no bounding box");
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("the About ✕ actually receives the tap and closes the panel (#249)", async ({ page }) => {
    await openHub(page);
    await clickChip(page, "About");
    const about = page.getByRole("dialog", { name: "About" });
    await expect(about).toBeVisible();
    // A REAL click (not dispatchEvent): Playwright's actionability check fails if the
    // button is covered, so this guards the #249 regression where the panel's in-flow
    // hero painted over the absolutely-positioned close button and swallowed taps.
    await about.getByRole("button", { name: "Close" }).click();
    await expect(about).toBeHidden();
  });

  test("the Sound toggle reflects and flips the muted state", async ({ page }) => {
    await openHub(page);
    const sound = chip(page, /Sound|Muted/);
    const before = await sound.getAttribute("aria-pressed");
    await expect(sound).toBeVisible();
    await sound.dispatchEvent("click"); // closes the fan
    await page.getByLabel("Actions").click(); // reopen to read the flipped state
    const after = await chip(page, /Sound|Muted/).getAttribute("aria-pressed");
    expect(after).not.toBe(before);
  });

  test("the Concentration toggle reflects and flips", async ({ page }) => {
    await openHub(page);
    expect(await chip(page, "Concentration").getAttribute("aria-pressed")).toBe("false");
    await clickChip(page, "Concentration");
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
