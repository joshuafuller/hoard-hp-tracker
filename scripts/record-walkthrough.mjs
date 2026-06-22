// Record a short guided walkthrough of the live app for the README (#155) — someone
// actually using Hoard: the orb draining on damage, healing back, the radial hub
// fanning open, coins, and the keypad — then ffmpeg → an optimized looping GIF.
//
//   pnpm build && pnpm preview --port 4173 &
//   node scripts/record-walkthrough.mjs        # → docs/gallery/walkthrough.gif
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.SHOT_URL ?? "http://localhost:4173";
const OUT = "docs/gallery";
mkdirSync(OUT, { recursive: true });
const vdir = mkdtempSync(join(tmpdir(), "hoard-walk-"));

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  recordVideo: { dir: vdir, size: { width: 390, height: 844 } },
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(BASE);
await page.waitForSelector(".hp-tracker", { state: "visible" });
await page.emulateMedia({ reducedMotion: "reduce" }); // reliable hub chip clicks
// Name the character so the tour shows a real sheet.
await page.locator(".character-name button").first().click();
await page.getByLabel("Character name").fill("Thorin Ironfist");
await page.keyboard.press("Enter");
await wait(1200); // hold on the full-HP hero

// Open the radial hub — the gold sigil fans out the actions.
await page.getByLabel("Actions").click();
await wait(1300);
await page.keyboard.press("Escape");
await wait(400);

// Damage via the keypad — the orb drains.
async function keypad(kind, n) {
  await page.getByLabel("Edit current HP").click();
  await wait(450);
  for (const d of String(n)) {
    await page.getByRole("dialog").getByRole("button", { name: d, exact: true }).click();
    await wait(160);
  }
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${kind}`, "i") }).click();
}
await keypad("damage", 7); // 10 → 3, orb drains to critical
await page.waitForSelector(".undo-pill", { state: "visible" });
await wait(1500);
await keypad("heal", 5); // back up
await wait(1300);

// The hoard — open coins via the hub.
await page.getByLabel("Actions").click();
await wait(150);
await page.getByRole("button", { name: "Coins", exact: true }).dispatchEvent("click");
await wait(1600);
await page.keyboard.press("Escape");
await wait(700);

const video = page.video();
await ctx.close();
await browser.close();
const src = await video.path();

// webm → optimized looping GIF (palette, ~12fps, 270px wide).
const gif = `${OUT}/walkthrough.gif`;
rmSync(gif, { force: true });
try {
  execFileSync("ffmpeg", [
    "-y", "-ss", "1.2", "-i", src, // trim the black pre-paint
    "-vf", "fps=12,scale=270:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
    "-loop", "0", gif,
  ], { stdio: "ignore" });
  console.log(`walkthrough → ${gif}`);
} catch (e) {
  console.warn("ffmpeg failed — no GIF written:", e.message);
}
rmSync(vdir, { recursive: true, force: true });
if (!existsSync(gif)) process.exitCode = 1;
