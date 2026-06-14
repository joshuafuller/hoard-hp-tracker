import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { manifest } from "./src/pwa-manifest";

// Base path: "/" for local dev + the self-hosted Docker build; a subpath (e.g.
// "/hoard-hp-tracker/") for a GitHub Pages project page, set via HOARD_BASE at
// build time. `process` exists at build time (Node); declared locally to avoid
// pulling @types/node into the app's type graph.
declare const process: { env: Record<string, string | undefined> };
const base = process.env.HOARD_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Never discover tests inside Stryker's sandbox copies (or build output).
    exclude: ["**/node_modules/**", "**/dist/**", "**/.stryker-tmp/**"],
  },
});
