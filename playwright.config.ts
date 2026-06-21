import { defineConfig, devices } from "@playwright/test";

// `process` exists when Playwright runs this config under Node; declared locally
// to avoid pulling @types/node into the type graph (mirrors vite.config.ts).
declare const process: { env: Record<string, string | undefined> };

/**
 * End-to-end layout guard for the Hoard HP Tracker.
 *
 * Playwright builds and previews the production bundle then checks the real
 * layout metrics that jsdom cannot see (box sizes, viewport overflow, CSS
 * grid, safe-area insets).  Chromium only — the CI target is mobile-Chrome.
 */
export default defineConfig({
  testDir: "./e2e",
  // Playwright specs never run under Vitest; keeping testDir explicit avoids
  // any accidental double-discovery if the include globs ever widen.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",

  use: {
    baseURL: "http://localhost:4173",
    // Reduce animation-related flakiness: browser honours prefers-reduced-motion.
    // In Playwright 1.60 this is a context option, not a top-level `use` key.
    contextOptions: { reducedMotion: "reduce" },
    // Capture a trace on retry so failures in CI are diagnosable.
    trace: "on-first-retry",
  },

  projects: [
    // iPhone 14 Pro dimensions — the primary mobile target for this PWA.
    {
      name: "mobile-chrome-390",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 390, height: 844 },
      },
    },
    // Compact Android phone — catches narrower screens.
    {
      name: "mobile-chrome-360",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 360, height: 640 },
      },
    },
  ],

  webServer: {
    // Build once then preview; the config's webServer block runs before any
    // test file so the dist is ready when the first spec opens a page.
    command: "pnpm build && pnpm preview --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
