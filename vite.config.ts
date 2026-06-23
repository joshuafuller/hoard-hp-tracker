import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { configDefaults, defineConfig } from "vitest/config";
import { manifest } from "./src/pwa-manifest";
import pkg from "./package.json";

// Base path: "/" for local dev + the self-hosted Docker build; a subpath (e.g.
// "/hoard-hp-tracker/") for a GitHub Pages project page, set via HOARD_BASE at
// build time. `process` exists at build time (Node); declared locally to avoid
// pulling @types/node into the app's type graph.
declare const process: { env: Record<string, string | undefined> };
const base = process.env.HOARD_BASE ?? "/";

// App version, injected at build time so About can show it with no manual edit
// (#166). package.json is the single source of truth; imported directly (no node:fs,
// keeping this config free of @types/node — Copilot #203). resolveJsonModule is on.
const appVersion = pkg.version;

export default defineConfig({
  base,
  // Compile-time constant — referenced as the global `__APP_VERSION__` (typed in
  // src/vite-env.d.ts).
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest,
      workbox: {
        // Includes the vendored dice-box engine + worker (js), themes (json/png/jpg)
        // and the Ammo physics (wasm) so 3D dice rolling works fully offline (#45).
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,webp,woff2,json,wasm}"],
        // The BabylonJS world bundle is ~1.4MB — lift the precache ceiling above the
        // 2MiB default so the engine is never silently skipped from the offline cache.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Keep Vitest's defaults (node_modules, dist, etc.), exclude Playwright e2e
    // specs (they import @playwright/test which is incompatible with jsdom),
    // never discover tests inside Stryker's sandbox copies, and skip agent git
    // worktrees nested under .claude/ so local + CI runs glob a single suite,
    // not N copies of the whole repo.
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      "**/.stryker-tmp/**",
      "**/.claude/**",
    ],
  },
});
