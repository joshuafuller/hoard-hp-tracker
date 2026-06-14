import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { configDefaults, defineConfig } from "vitest/config";
import { manifest } from "./src/pwa-manifest";

// Base path: "/" for local dev + the self-hosted Docker build; a subpath (e.g.
// "/hoard-hp-tracker/") for a GitHub Pages project page, set via HOARD_BASE at
// build time. `process` exists at build time (Node); declared locally to avoid
// pulling @types/node into the app's type graph.
declare const process: { env: Record<string, string | undefined> };
const base = process.env.HOARD_BASE ?? "/";

// The prod build is served at the site root and its service worker's scope
// covers the whole site — including the /beta/ sub-app. Stop prod's SW from
// serving its SPA fallback for /beta/ routes so the beta app loads from network
// (and registers its own, more-specific SW). The beta build must NOT denylist
// its own paths, so this only applies when we're not the beta build. Match a
// base ending in /beta or /beta/ (tolerant of a missing trailing slash).
const isBeta = /\/beta\/?$/.test(base);

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
        ...(isBeta ? {} : { navigateFallbackDenylist: [/\/beta(\/|$)/] }),
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Keep Vitest's defaults (node_modules, dist, etc.) and also never discover
    // tests inside Stryker's sandbox copies.
    exclude: [...configDefaults.exclude, "**/.stryker-tmp/**"],
  },
});
