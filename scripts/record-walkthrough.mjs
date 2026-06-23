// Record a guided PLAY SESSION of the live app for the README (#155) — someone
// actually using Hoard: naming a character, taking damage (the liquid HP orb
// SLOSHES as it drains), healing, the coin calculator (add across denominations +
// auto-distill to fewest coins), and a dice throw with real physics.
//
// Animations are ON (no reduced-motion). A synthetic cursor + click pulse is drawn so
// every interaction is visible. Pacing is tuned to the app's own animation speeds
// (--dur-fast 140ms, --dur-flow 600ms): act → let the animation finish → a beat to
// look → next. Controls over the WebGL canvas are clicked via dispatchEvent (the e2e
// hit-test workaround) so clicks land mid-animation without freezing anything.
//
// Output: an mp4 (README <video> hero / HyperFrames source) + a looping GIF fallback.
//
//   pnpm build && pnpm preview --port 4173 &
//   node scripts/record-walkthrough.mjs        # → docs/gallery/walkthrough.{mp4,gif}
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

// Beat instrumentation: recordVideo starts ~at context creation, so elapsed-since-now
// ≈ video time. We print each beat's clip-time (video time minus the ffmpeg trim) so
// the composition can place captions/narration on the REAL beat, not an estimate.
const TRIM_S = 1.0;
const t0 = Date.now();
const MARKS = {};
const mark = (name) => { MARKS[name] = (Date.now() - t0) / 1000; };

// Pacing, tuned to the app's animation tokens.
const CURSOR = 480; // cursor glides to its target
const LOOK = 750; // a beat to take it in (after a ~140ms transition)
const FLOW = 1200; // read time after a ~600ms flow animation (HP slosh)

await page.goto(BASE);
await page.waitForSelector(".hp-tracker", { state: "visible" });

// A synthetic cursor + click pulse so the viewer can follow every interaction.
await page.addStyleTag({
  content: `
    #__cur { position: fixed; z-index: 2147483647; left: 50%; top: 60%; width: 26px; height: 26px;
      margin: -13px 0 0 -13px; border-radius: 50%; border: 2px solid rgba(244,236,221,.95);
      background: rgba(232,180,90,.22); box-shadow: 0 2px 10px rgba(0,0,0,.5), 0 0 14px rgba(232,180,90,.5);
      pointer-events: none; transition: left .46s cubic-bezier(.33,0,.2,1), top .46s cubic-bezier(.33,0,.2,1); }
    #__pulse { position: fixed; z-index: 2147483646; width: 26px; height: 26px; margin: -13px 0 0 -13px;
      border-radius: 50%; background: rgba(232,180,90,.55); pointer-events: none; opacity: 0; }
    #__pulse.go { animation: __pp .5s ease-out; }
    @keyframes __pp { 0%{transform:scale(.6);opacity:.7} 100%{transform:scale(3.4);opacity:0} }`,
});
await page.evaluate(() => {
  for (const id of ["__pulse", "__cur"]) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
});

async function moveTo(locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(({ x, y }) => {
    const c = document.getElementById("__cur");
    if (c) { c.style.left = x + "px"; c.style.top = y + "px"; }
  }, { x, y });
  return { x, y };
}

// Glide the cursor to the target, pulse, then fire the click (dispatchEvent bypasses
// the WebGL-canvas hit-test + any in-flight animation).
async function tap(locator) {
  await locator.waitFor({ state: "visible", timeout: 6000 });
  const p = await moveTo(locator);
  await wait(CURSOR);
  if (p) {
    await page.evaluate(({ x, y }) => {
      const r = document.getElementById("__pulse");
      if (!r) return;
      r.style.left = x + "px"; r.style.top = y + "px";
      r.classList.remove("go"); void r.offsetWidth; r.classList.add("go");
    }, p);
  }
  await wait(140); // the press
  await locator.dispatchEvent("click");
}

// ── Name the character ────────────────────────────────────────────────────────
await tap(page.locator(".character-name button").first());
await page.getByLabel("Character name").fill("Thorin Ironfist");
await page.keyboard.press("Enter");
mark("hook");
await wait(LOOK + 1000); // hold on the full-HP hero — give the opening room

// ── HP: DRAG the orb down to damage (hero gesture), then heal with the keypad ──
async function hpKeypad(kind, n) {
  await tap(page.getByLabel("Edit current HP"));
  await wait(LOOK); // keypad rises (600ms) — beat
  for (const d of String(n)) {
    await tap(page.getByRole("dialog").getByRole("button", { name: d, exact: true }));
    await wait(160);
  }
  await wait(260); // a beat on the entered number
  await tap(page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${kind}`, "i") }));
}
// Drag DOWN on the orb: a real pointer drag (>6px) drains it, scaled to the drag
// distance. The synthetic cursor rides the drag so the gesture is legible.
async function dragOrbDown(fraction) {
  const box = await page.locator(".vessel__orb").boundingBox();
  if (!box) return;
  const cx = Math.round(box.x + box.width / 2);
  const y0 = Math.round(box.y + box.height * 0.36);
  const setCur = (y) => page.evaluate(({ x, y }) => { const c = document.getElementById("__cur"); if (c) { c.style.left = x + "px"; c.style.top = y + "px"; } }, { x: cx, y: Math.round(y) });
  await setCur(y0); await wait(CURSOR);
  await page.mouse.move(cx, y0);
  await page.mouse.down();
  const dist = box.height * fraction;
  for (let i = 1; i <= 28; i++) { const y = y0 + (dist * i) / 28; await page.mouse.move(cx, y); await setCur(y); await wait(15); }
  await wait(150);
  await page.mouse.up();
}

// SCENE 2 — drag the orb down; the liquid follows the finger and drains to red.
mark("drag");
await dragOrbDown(0.78); // ~8 damage → deep bloodied red
await page.waitForSelector(".undo-pill", { state: "visible" }).catch(() => {});
await wait(FLOW + 1300); // SCENE 3 — glance: hold on the bloodied orb (breathe)
// SCENE 4 — heal with the exact keypad → the orb refills.
mark("heal");
await hpKeypad("heal", 6);
await wait(FLOW + 500);

// ── Coins: the calculator — add across denominations, then auto-distill ───────
// Type digits into the open amount keypad and commit with Add (keypad stays open).
async function typeAdd(n) {
  for (const d of String(n)) {
    await tap(page.getByRole("dialog").getByRole("button", { name: d, exact: true }));
    await wait(150);
  }
  await wait(220);
  await tap(page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }));
  await wait(LOOK);
}
try {
  await tap(page.getByLabel("Actions"));
  await wait(LOOK);
  await tap(page.getByRole("button", { name: "Coins", exact: true }));
  await wait(LOOK); // coin sheet (the HOARD console) slides in
  mark("coins");

  // Start editing on silver (overview row → retargetable keypad), add 40.
  await tap(page.locator('.coin-row[data-kind="sp"] .coin-row__count'));
  await wait(LOOK);
  await typeAdd("40"); // 40 silver — distills cleanly to 4 gold
  // Auto-distill: collapse the purse into the fewest coins.
  const distill = page.getByRole("button", { name: /distill to fewest/i });
  if (await distill.isEnabled().catch(() => false)) {
    await tap(distill);
    await wait(LOOK);
    const confirm = page.getByRole("dialog").getByRole("button", { name: /distill|confirm/i }).last();
    await tap(confirm).catch(() => {});
    await wait(FLOW);
  }
} catch (e) {
  console.warn("coin demo step skipped:", e.message);
}
await page.keyboard.press("Escape");
await wait(LOOK);

// ── Dice: a real throw with physics ──────────────────────────────────────────
try {
  await tap(page.getByLabel("Actions"));
  await wait(LOOK);
  await tap(page.getByRole("button", { name: "Dice", exact: true }));
  await page.getByLabel("Dice notation").waitFor({ state: "visible" });
  await wait(LOOK);
  await tap(page.getByLabel("Dice notation"));
  await page.getByLabel("Dice notation").fill("2d6");
  await wait(360);
  mark("dice");
  await tap(page.getByRole("button", { name: "Throw", exact: true }));
  // Let the dice tumble + settle (physics), then read the result.
  await page.locator(".dice-result__total").waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  mark("result");
  await wait(FLOW + 900);
  const apply = page.getByRole("button", { name: /apply as heal/i });
  if (await apply.isVisible().catch(() => false)) {
    await tap(apply);
    await wait(FLOW);
  }
} catch (e) {
  console.warn("dice demo step skipped:", e.message);
}
await wait(700);
mark("end");

const video = page.video();
await ctx.close();
await browser.close();
const src = await video.path();

// webm → mp4 hero (h264, full source fps, web-friendly) + a looping GIF fallback.
const mp4 = `${OUT}/walkthrough.mp4`;
const gif = `${OUT}/walkthrough.gif`;
const trim = ["-ss", "1.0"]; // drop the black pre-paint
rmSync(mp4, { force: true });
rmSync(gif, { force: true });
try {
  execFileSync("ffmpeg", [
    "-y", ...trim, "-i", src,
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow",
    // Dense keyframes (1/sec): browsers don't care, but deterministic frame-capture
    // tools (e.g. HyperFrames) need them to seek the clip without freezing (#155).
    "-r", "30", "-g", "30", "-keyint_min", "30",
    "-movflags", "+faststart", "-an", mp4,
  ], { stdio: "ignore" });
  console.log(`hero → ${mp4}`);
} catch (e) {
  console.warn("ffmpeg mp4 failed:", e.message);
}
try {
  execFileSync("ffmpeg", [
    "-y", ...trim, "-i", src,
    "-vf", "fps=20,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
    "-loop", "0", gif,
  ], { stdio: "ignore" });
  console.log(`fallback → ${gif}`);
} catch (e) {
  console.warn("ffmpeg gif failed:", e.message);
}
rmSync(vdir, { recursive: true, force: true });

console.log("\nBEATS (clip-time seconds = video time − trim):");
for (const [k, v] of Object.entries(MARKS)) console.log(`  ${k.padEnd(8)} ${(v - TRIM_S).toFixed(2)}`);

if (!existsSync(mp4)) process.exitCode = 1;
