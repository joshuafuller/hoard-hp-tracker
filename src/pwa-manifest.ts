import type { ManifestOptions } from "vite-plugin-pwa";

export const manifest: Partial<ManifestOptions> = {
  name: "Hoard HP Tracker",
  short_name: "HP",
  description: "A fullscreen, mobile HP tracker — current, max, and temp HP.",
  display: "fullscreen",
  orientation: "portrait",
  background_color: "#0b0a08",
  theme_color: "#0b0a08",
  // Relative URLs so the PWA works under any base path: "/" (Docker / self-host)
  // and a subpath (GitHub Pages). Resolved against the manifest URL.
  id: ".",
  scope: ".",
  start_url: ".",
  icons: [
    { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "icons/icon-512-maskable.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};
