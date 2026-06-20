// Vendor @3d-dice/dice-box's dist into public/dice/ so the engine, its web worker
// (world.*.js), the Ammo physics wasm, and the dice themes are all served
// SAME-ORIGIN and precached by Workbox for offline play (#45). dice-box resolves
// its worker relative to the es-module URL and its assets from `assetPath`, so a
// Vite-bundled import would break the worker path — we load the vendored copy at
// runtime instead. Run by `predev`/`prebuild` (see package.json); output is
// git-ignored and regenerated from node_modules.
import { cp, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@3d-dice", "dice-box", "dist");
const dest = join(root, "public", "dice");

await rm(dest, { recursive: true, force: true });
// Vendor the MINIFIED engine (smaller offline precache — respects the install-size
// NFR): keep `*.min.js` (dice-box.es.min.js + its world.*.min.js workers + Dice.min.js)
// and all non-JS assets (themes, ammo.wasm, css); drop the larger non-min `.js`
// twins and source maps. The loader imports `dice-box.es.min.js`.
await cp(src, dest, {
  recursive: true,
  filter: (p) => {
    if (p.endsWith(".map")) return false;
    if (p.endsWith(".js") && !p.endsWith(".min.js")) return false;
    return true;
  },
});

const files = await readdir(dest);
console.log(`[vendor-dice] copied ${files.length} entries → public/dice/`);
