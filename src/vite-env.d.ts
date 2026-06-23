/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** App version, injected at build time from package.json (see vite.config.ts `define`). */
declare const __APP_VERSION__: string;

/** Build identity (git describe + date), injected at build time (#169; see vite.config.ts `define`). */
declare const __BUILD__: string;
