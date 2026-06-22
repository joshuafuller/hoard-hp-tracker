// Compose the captured app screenshots (scripts/capture-screenshots.mjs) into a
// cohesive, device-framed, branded README gallery (#155). Renders an HTML layout —
// phone mockups on the Molten Hoard backdrop with captions, and a hero strip where
// the HP orb drains full→bloodied→critical across three panels (a continuous element
// spanning multiple shots, meaningfully) — then screenshots it.
//
//   node scripts/capture-screenshots.mjs   # first → docs/screenshots/*.png
//   node scripts/compose-gallery.mjs       # → docs/gallery/*.png
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

const SHOTS = "docs/screenshots";
const OUT = "docs/gallery";
mkdirSync(OUT, { recursive: true });

const uri = (name) => `data:image/png;base64,${readFileSync(`${SHOTS}/${name}.png`).toString("base64")}`;

// A phone-mockup card: notch + bezel + rounded screen wrapping a capture, with a
// gold caption beneath.
const phone = (name, caption) => `
  <figure class="phone">
    <div class="phone__frame">
      <span class="phone__notch"></span>
      <img class="phone__screen" src="${uri(name)}" alt="${caption}" />
    </div>
    <figcaption>${caption}</figcaption>
  </figure>`;

const CSS = `
  :root { --gold:#d9b85c; --ink:#f4ecd8; }
  * { margin:0; box-sizing:border-box; }
  body { font-family:"DM Sans","Segoe UI",system-ui,sans-serif; color:var(--ink); }
  .sheet { width:1200px; padding:54px 48px 60px; position:relative; overflow:hidden;
    background:radial-gradient(120% 90% at 50% -8%, #2a2010 0%, #140f08 46%, #0c0905 100%); }
  .bloom { position:absolute; inset:0; pointer-events:none;
    background:radial-gradient(46% 36% at 50% 4%, rgba(217,184,92,.22), transparent 70%); }
  .head { text-align:center; position:relative; margin-bottom:30px; }
  .head h1 { font-size:46px; font-weight:800; letter-spacing:.01em;
    background:linear-gradient(180deg,#f8ecc4,#d9b85c 60%,#b08f3e);
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  .head p { margin-top:8px; font-size:18px; opacity:.78; }
  .row { display:flex; gap:34px; justify-content:center; align-items:flex-end; position:relative; }
  /* Hero strip: a molten ribbon draining gold→amber→ruby beneath the three tiers. */
  .hero { position:relative; padding:26px 0 8px; margin-bottom:14px; }
  .hero .ribbon { position:absolute; left:6%; right:6%; bottom:78px; height:90px; border-radius:80px; filter:blur(26px);
    background:linear-gradient(90deg, rgba(95,201,138,.5) 0%, rgba(217,184,92,.55) 34%, rgba(224,150,60,.5) 64%, rgba(216,69,59,.55) 100%); }
  .phone { width:268px; text-align:center; position:relative; }
  .phone__frame { position:relative; border-radius:38px; padding:9px; background:linear-gradient(160deg,#2b2517,#0e0b07);
    box-shadow:0 30px 60px rgba(0,0,0,.6), inset 0 0 0 1.5px rgba(217,184,92,.32), inset 0 2px 0 rgba(255,247,224,.08); }
  .phone__notch { position:absolute; top:9px; left:50%; transform:translateX(-50%); width:96px; height:20px;
    background:#0e0b07; border-radius:0 0 14px 14px; z-index:2; }
  .phone__screen { display:block; width:250px; border-radius:30px; }
  .phone figcaption { margin-top:16px; font-size:16px; font-weight:700; color:var(--gold); }
  .phone figcaption small { display:block; font-weight:500; font-size:13px; color:var(--ink); opacity:.6; margin-top:3px; }
`;

const heroHtml = `
  <div class="sheet"><div class="bloom"></div>
    <div class="head"><h1>Hoard</h1><p>Your party's lifeblood, at a glance — gold to bloodied to critical.</p></div>
    <div class="hero"><div class="ribbon"></div>
      <div class="row">
        ${phone("01-hero-full", "Healthy<small>full HP</small>")}
        ${phone("02-hero-bloodied", "Bloodied<small>half HP</small>")}
        ${phone("03-hero-critical", "Critical<small>near death</small>")}
      </div>
    </div>
  </div>`;

const featuresHtml = `
  <div class="sheet"><div class="bloom"></div>
    <div class="head"><h1>At the table, offline</h1><p>Everything a tap away — HP, coins, dice, concentration.</p></div>
    <div class="row">
      ${phone("06-hub", "One gold sigil<small>fans out every action</small>")}
      ${phone("04-keypad", "Damage &amp; heal<small>no OS keyboard</small>")}
      ${phone("05-coins", "Track the hoard<small>auto-distill</small>")}
      ${phone("08-concentration", "Concentration<small>CON-save prompt</small>")}
    </div>
  </div>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (const [file, html, w] of [["hero", heroHtml, 1200], ["features", featuresHtml, 1200]]) {
  await page.setContent(`<style>${CSS}</style>${html}`, { waitUntil: "networkidle" });
  const sheet = page.locator(".sheet");
  await page.waitForTimeout(200);
  await sheet.screenshot({ path: `${OUT}/${file}.png` });
  console.log(`gallery → ${OUT}/${file}.png`);
  void w;
}
await browser.close();
