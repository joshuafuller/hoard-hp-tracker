# Hero / explainer video — pipeline (deferred, do LAST)

A narrated explainer for the README, captured from the **final** product. Proven end-to-end;
parked until the app is built out so the video shows the finished thing. Tracks against #155.

## Pipeline (two stages)

1. **Capture** — `scripts/record-walkthrough.mjs` records the live app (Playwright) to
   `docs/gallery/walkthrough.mp4`:
   - animations ON (no reduced-motion), so the liquid slosh / dice physics actually render;
   - a synthetic cursor + click pulses so interactions are legible;
   - the play session: name → **orb-drag to damage** (hero gesture) → glance → keypad heal →
     coin calculator (distill) → dice throw;
   - prints **beat timestamps** (`BEATS …`) so captions/VO can be pinned to the real moment;
   - dense keyframes (`-g 30`) so HyperFrames can seek the clip without freezing.

2. **Compose** — `composition.html` is a [HyperFrames](https://hyperframes.heygen.com) composition
   (skills symlinked in `~/.claude/skills`, repo at `~/development/hyperframes`): a CSS **phone
   mockup** (left) playing the clip, **animated captions** (right) on the Molten Hoard palette
   (Fraunces + DM Sans), and a **per-beat voiceover**. Renders to mp4 with `npm run render`.

   To render: `npx hyperframes init videos/hero --example=blank`, drop `composition.html` →
   `index.html`, copy `docs/gallery/walkthrough.mp4` + `assets/fonts/*` + the narration wavs into
   `assets/`, then `npm run check && npm run render`.

## Locked so far
- **Script** (5 beats, written to the *Marcus* persona, non-salesy): drag-to-damage → exact heal →
  coins/distill → dice → "offline, no account, free — now pass the turn." (see `composition.html` captions).
- **Timing**: pin each caption/VO to the printed beat marks (don't estimate).

## Open decisions (when we resume)
- **Voice**: tried Kokoro `af_heart` (a little flat) and ElevenLabs **"Mark - Natural Conversations"**
  (per-beat takes generated, not loved). Try ElevenLabs Jessica / Matilda / Charlie, or Mark with
  lower Stability. ElevenLabs takes were in the maintainer's `Downloads/Eleven Labs`.
- **Theme**: pick one — cinematic dark+gold (current), editorial/restrained, or punchy kinetic.
- **Music**: optional low forge/tavern bed (HyperFrames `hyperframes-media`).
- **Format/placement**: landscape explainer (social/README) vs portrait phone-only loop.
