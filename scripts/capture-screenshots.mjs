// Reproducible README screenshots (#41). Drives the production preview in a
// mobile viewport via Playwright and captures the core surfaces. Each run starts
// from a fresh browser profile, so the first-run seed (10/10 HP) is deterministic.
//
//   pnpm build && pnpm preview --port 4173 &
//   node scripts/capture-screenshots.mjs        # → docs/screenshots/*.png
//
// WebGL (the liquid orb) runs via SwiftShader in headless Chromium; if it can't,
// the app's static fallback fill renders instead — either way the orb shows HP.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.SHOT_URL ?? "http://localhost:4173";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const settle = (ms = 900) => page.waitForTimeout(ms);

async function boot() {
  await page.goto(BASE);
  await page.waitForSelector(".hp-tracker", { state: "visible" });
  await settle();
}

// Open the keypad and drive a relative Damage of `n` (10 → 10-n).
async function damage(n) {
  await page.getByLabel("Edit current HP").click();
  const dialog = page.getByRole("dialog");
  for (const d of String(n)) await dialog.getByRole("button", { name: d, exact: true }).click();
  await dialog.getByRole("button", { name: /^damage/i }).click();
  await page.waitForSelector(".undo-pill", { state: "visible" });
  await settle(700);
}

await boot();
await shot("01-hero-full"); // 10/10 — healthy (gold/emerald tier)

await damage(5); // → 5/10 — bloodied
await shot("02-hero-bloodied");

await damage(3); // → 2/10 — critical
await shot("03-hero-critical");

// Keypad open, mid-entry (shows the no-OS-keyboard quick entry).
await page.getByLabel("Edit current HP").click();
const kp = page.getByRole("dialog");
for (const d of "12") await kp.getByRole("button", { name: d, exact: true }).click();
await settle(300);
await shot("04-keypad");
await page.keyboard.press("Escape");
await settle(300);

// Coin sheet (hoard + denomination rows + steppers).
await page.getByLabel("Coins").click();
await settle(400);
await shot("05-coins");
await page.keyboard.press("Escape");
await settle(300);

await ctx.close();

// Fresh context (full HP) for the identity field + the concentration CON-save prompt.
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p2 = await ctx2.newPage();
await p2.goto(BASE);
await p2.waitForSelector(".hp-tracker", { state: "visible" });
await p2.waitForTimeout(800);
// Character name — set an identity to show the named-character state.
await p2.locator(".character-name button").first().click();
await p2.getByLabel("Character name").fill("Thorin Ironfist");
await p2.keyboard.press("Enter");
await p2.waitForTimeout(400);
await p2.screenshot({ path: `${OUT}/07-character-name.png` });
// Concentration — enable it, then take damage (10 → 6, still alive) to fire the CON-save prompt.
await p2.getByLabel("Concentration").click();
await p2.waitForTimeout(300);
await p2.getByLabel("Edit current HP").click();
const cdlg = p2.getByRole("dialog");
await cdlg.getByRole("button", { name: "4", exact: true }).click();
await cdlg.getByRole("button", { name: /^damage/i }).click();
await p2.waitForSelector(".concentration-prompt", { state: "visible" });
await p2.waitForTimeout(400);
await p2.screenshot({ path: `${OUT}/08-concentration.png` });
await ctx2.close();

// Animated capture: a fresh context that records video while we drive a quick
// damage→heal so the liquid slosh + keypad show in motion, then ffmpeg → GIF.
const vdir = `${OUT}/.video`;
mkdirSync(vdir, { recursive: true });
const vctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  recordVideo: { dir: vdir, size: { width: 390, height: 844 } },
});
const vpage = await vctx.newPage();
await vpage.goto(BASE);
await vpage.waitForSelector(".hp-tracker", { state: "visible" });
await vpage.waitForTimeout(900);
await vpage.getByLabel("Edit current HP").click();
const vkp = vpage.getByRole("dialog");
await vkp.getByRole("button", { name: "4", exact: true }).click();
await vpage.waitForTimeout(500);
await vkp.getByRole("button", { name: /^damage/i }).click(); // 10 → 6 (slosh down)
await vpage.waitForSelector(".undo-pill", { state: "visible" });
await vpage.waitForTimeout(1100);
await vpage.getByLabel("Edit current HP").click();
await vpage.getByRole("dialog").getByRole("button", { name: "3", exact: true }).click();
await vpage.waitForTimeout(400);
await vpage.getByRole("dialog").getByRole("button", { name: /^heal/i }).click(); // 6 → 9 (slosh up)
await vpage.waitForTimeout(1300);
const videoPath = await vpage.video().path();
await vctx.close();
await browser.close();

// webm → optimized GIF (palette for quality, ~12fps, ~360px wide). execFile (no
// shell) — args are passed directly, so paths can't be interpreted as shell tokens.
const { execFileSync } = await import("node:child_process");
try {
  execFileSync(
    "ffmpeg",
    [
      "-y", "-ss", "1.3", "-i", videoPath, // skip the black pre-paint lead-in
      "-vf", "fps=9,scale=264:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
      `${OUT}/06-keypad-slosh.gif`,
    ],
    { stdio: "ignore" },
  );
  console.log("gif → 06-keypad-slosh.gif");
} catch (e) {
  console.warn("ffmpeg GIF step failed (static PNGs still captured):", e.message);
}
console.log(`captured → ${OUT}/`);
