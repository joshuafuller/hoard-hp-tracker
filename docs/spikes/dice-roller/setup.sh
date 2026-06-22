#!/usr/bin/env bash
# Reproduce the 3D dice spike locally. Run from this directory.
# Regenerates the generated/heavy bits that are NOT committed (dist/, parser.js).
set -e
npm init -y >/dev/null 2>&1 || true
npm i @3d-dice/dice-box@1.1.4 @3d-dice/dice-parser-interface@0.2.1
rm -rf dist && cp -r node_modules/@3d-dice/dice-box/dist ./dist
echo 'export { default } from "@3d-dice/dice-parser-interface";' > parser-entry.js
npx --yes esbuild parser-entry.js --bundle --format=esm --outfile=parser.js
echo "Done. Serve:  python3 -m http.server 8900   →  http://localhost:8900/"
