/**
 * Layout guard for the Hoard HP Tracker PWA.
 *
 * jsdom has no layout engine, so these checks cannot run under vitest.
 * Playwright drives a real Chromium instance against the production bundle
 * (built + previewed by the webServer config in playwright.config.ts) and
 * asserts the metrics that matter on mobile:
 *
 *  1. The footer/controls stay fully on-screen even with a simulated safe-area
 *     inset applied (env(safe-area-inset-bottom) returns 0 in headless, so we
 *     inject a synthetic inset via CSS variable and verify the layout still
 *     respects it).
 *  2. The liquid-orb (.vessel) top position does not jump when HP changes
 *     (applying damage must not re-centre the orb).
 *  3. The quick-entry keypad opens on tapping the HP number and renders keys
 *     large enough to tap (≥ 80 px wide).
 */

import { test, expect } from "@playwright/test";

test.describe("mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app shell to hydrate (Dexie seed + React render).
    await page.waitForSelector(".hp-tracker", { state: "visible" });
  });

  test("footer controls are fully within the viewport", async ({ page }) => {
    const viewportHeight = page.viewportSize()!.height;

    // Simulate a non-zero safe-area inset at the bottom (headless always
    // reports 0 for env(safe-area-inset-*)).  The styles.css padding uses
    // env() directly; inject a padding override on the outermost shell so we
    // can confirm the controls don't overflow even with extra bottom chrome.
    await page.addStyleTag({
      content: ".hp-tracker { padding-bottom: max(env(safe-area-inset-bottom, 0px), 34px) !important; }",
    });

    const footer = page.locator(".hp-tracker__footer");
    const footerBox = await footer.boundingBox();
    expect(footerBox, "footer must be in the DOM").not.toBeNull();

    const footerBottom = footerBox!.y + footerBox!.height;
    // Allow a 2 px rounding tolerance.
    expect(footerBottom).toBeLessThanOrEqual(viewportHeight + 2);
  });

  test("orb top is stable after an HP change", async ({ page }) => {
    const vessel = page.locator(".vessel").first();

    const boxBefore = await vessel.boundingBox();
    expect(boxBefore, "vessel must be visible").not.toBeNull();

    // Apply damage via the orb→keypad path (the ± steppers were removed in
    // favour of orb-drag; the keypad is the deterministic way to drive a change).
    await page.getByLabel("Edit current HP").click();
    const kp = page.getByRole("dialog");
    await kp.getByRole("button", { name: "5", exact: true }).click();
    await kp.getByRole("button", { name: /^damage/i }).click();

    // Wait for the HP display to reflect the change (the undo pill text
    // confirms the store has committed) before re-measuring.
    await page.waitForSelector(".undo-pill", { state: "visible" });

    const boxAfter = await vessel.boundingBox();
    expect(boxAfter, "vessel must still be visible after HP change").not.toBeNull();

    // The orb lives in a flex:1 stage row; it must not be re-centred by the
    // store update.  Allow ±2 px for sub-pixel / rounding differences.
    expect(Math.abs(boxAfter!.y - boxBefore!.y)).toBeLessThanOrEqual(2);
  });

  test("dice tray: all die chips fit within the viewport (no clipping)", async ({ page }) => {
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;

    // Open the tray (now via the radial hub) and build a mixed pool to stress the
    // chip row + dock.
    await page.getByLabel("Actions").click();
    await page.getByRole("button", { name: "Dice", exact: true }).click(); // not "Hit Dice"
    await page.getByLabel("Add d20").click();
    await page.getByLabel("Add d6").click();
    await page.getByLabel("Add d6").click();
    await page.getByLabel("Add d4").click();

    // Every die chip must sit fully within the viewport width (the pre-rework
    // overflow:auto circles clipped d100 on narrow phones — this guards it).
    const chips = page.locator(".dice-chip");
    const count = await chips.count();
    expect(count).toBe(7);
    for (let i = 0; i < count; i++) {
      const box = await chips.nth(i).boundingBox();
      expect(box, "chip must be laid out").not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-2);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 2);
    }

    // The dock itself must not overflow the screen bottom (one-screen budget).
    const dock = page.locator(".dice-tray__dock");
    const dockBox = await dock.boundingBox();
    expect(dockBox, "dock must be laid out").not.toBeNull();
    expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(vh + 2);
  });

  test("keypad opens with adequately-sized keys", async ({ page }) => {
    // Tapping the current-HP number opens the quick-entry keypad.
    await page.getByLabel("Edit current HP").click();

    // The keypad renders as a dialog overlay.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Pick any digit key (there are 9: 1–9). Keys are the shared Key primitive (#89).
    const key = dialog.locator(".ctl-key").first();
    await expect(key).toBeVisible();

    const keyBox = await key.boundingBox();
    expect(keyBox, "keypad key must be in the DOM").not.toBeNull();

    // At 390 × 844 a 3-column grid key should be ≥ 80 px wide; at 360 × 640
    // it should still be ≥ 70 px.  Use 70 as a shared floor so both viewport
    // projects pass.
    expect(keyBox!.width).toBeGreaterThanOrEqual(70);
    // Keys must also meet the minimum tap-target height declared in CSS
    // (clamp(52px, …, 66px)).
    expect(keyBox!.height).toBeGreaterThanOrEqual(50);
  });
});
