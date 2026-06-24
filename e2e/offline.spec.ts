/**
 * Offline / PWA (#174): the app installs a service worker, still loads with the
 * network cut (Workbox precache serves the shell), and ships an installable
 * manifest. Runs against the production build (the webServer previews `dist`,
 * where vite-plugin-pwa emits the SW + manifest). Both viewport projects.
 */
import { test, expect, type Page } from "./fixtures";

const swReady = (page: Page) =>
  page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });

test.describe("offline / PWA (#174)", () => {
  test("registers a service worker on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    expect(await swReady(page)).toBe(true);
  });

  test("serves a web app manifest with installable fields", async ({ page, baseURL }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href, "a <link rel=manifest> is present").toBeTruthy();
    const res = await page.request.get(new URL(href!, baseURL).toString());
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(["standalone", "fullscreen", "minimal-ui"]).toContain(m.display); // installable display mode
    expect(Array.isArray(m.icons) && m.icons.length).toBeTruthy(); // needs ≥1 icon to install
  });

  test("loads with the network offline (Workbox precache serves the shell)", async ({ page, context }) => {
    await page.goto("/");
    await page.waitForSelector(".hp-tracker", { state: "visible" });
    await swReady(page); // precache must be populated before we cut the network

    await context.setOffline(true);
    try {
      await page.reload();
      await expect(page.locator(".hp-tracker")).toBeVisible(); // served from cache, no network
    } finally {
      await context.setOffline(false);
    }
  });
});
