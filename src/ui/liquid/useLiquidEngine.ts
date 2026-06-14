import { useEffect, useRef } from "react";
import { LiquidRenderer } from "./renderer";
import { Sph } from "./sph";
import type { Gravity } from "./useGyro";

export interface LiquidEngineOpts {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** HP fill fraction 0..1 (current / max) */
  ratio: number;
  /** temp-HP fraction 0..1 (temp / max) — a shimmer layer on top */
  tempRatio: number;
  /** surface + deep tint, each 0..1 rgb */
  color: [number, number, number];
  deep: [number, number, number];
  /** temp-HP tint (cyan), 0..1 rgb */
  tempColor: [number, number, number];
  /** live gravity direction (from the gyro hook) */
  gravity: React.MutableRefObject<Gravity>;
  /** false → tear down (used for the reduced-motion / unsupported fallback) */
  active: boolean;
}

const SUBSTEPS = 3;
const SIM_DT = 0.006;
const MAX_DPR = 2;

/**
 * Owns the fluid sim, the WebGL renderer, and the animation loop. Particle counts
 * track HP and temp-HP as volume: they ease toward target each frame so damage
 * drains the pool and heal pours it back in, with a splash on any change. Pauses
 * when the tab is hidden.
 */
export function useLiquidEngine(opts: LiquidEngineOpts): void {
  const { canvasRef, gravity, active } = opts;
  // keep the latest visual inputs in a ref so the rAF loop sees them without
  // being torn down and rebuilt on every prop change
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    let renderer: LiquidRenderer;
    try {
      renderer = new LiquidRenderer(canvas);
    } catch {
      return; // caller's fallback handles unsupported WebGL2
    }

    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    const cssSize = canvas.clientWidth || 320;
    const px = Math.round(cssSize * dpr);
    canvas.width = px;
    canvas.height = px;
    renderer.resize(px, px);

    const radius = px * 0.5;
    const h = Math.max(8, radius * 0.135);
    const sim = new Sph({ cx: px / 2, cy: px / 2, radius, params: { h } });
    const pointSize = h * 3.0;
    const cap = sim.capacity;

    // Temp-HP claims its share of the bowl from the top; HP fills below with the
    // remaining room. So a shielded, full-HP hero shows a cyan cap over the green.
    const tempTarget = () => Math.min(cap, Math.round(latest.current.tempRatio * cap));
    const hpTarget = (temp: number) => Math.min(cap - temp, Math.round(latest.current.ratio * cap));

    // seed at the current fill so the first paint is already settled-ish
    const seedTemp = tempTarget();
    sim.setTempCount(seedTemp);
    sim.setCount(hpTarget(seedTemp));
    for (let i = 0; i < 40; i++) sim.step(SIM_DT, 0, 1);

    let raf = 0;
    let running = true;
    let time = 0;
    let lastHp = sim.countOf(0);
    let lastTemp = seedTemp;
    const ease = Math.max(1, Math.ceil(cap * 0.05));

    const frame = () => {
      if (!running) return;
      time += 1 / 60;

      // temp claims its share first; HP eases into the remaining room
      const tempWant = tempTarget();
      const haveTemp = sim.countOf(1);
      if (tempWant !== haveTemp) {
        sim.setTempCount(haveTemp + Math.sign(tempWant - haveTemp) * Math.min(ease, Math.abs(tempWant - haveTemp)));
      }
      const hpWant = hpTarget(tempWant);
      const haveHp = sim.countOf(0);
      if (hpWant !== haveHp) {
        sim.setCount(haveHp + Math.sign(hpWant - haveHp) * Math.min(ease, Math.abs(hpWant - haveHp)));
      }

      // a jolt of slosh whenever the player's HP/temp target jumps (damage/heal)
      const dHp = Math.abs(hpWant - lastHp);
      const dTemp = Math.abs(tempWant - lastTemp);
      if (dHp + dTemp > 0) {
        sim.splash(Math.min(420, 90 + (dHp + dTemp) * 6));
        lastHp = hpWant;
        lastTemp = tempWant;
      }

      const g = latest.current.gravity.current;
      for (let s = 0; s < SUBSTEPS; s++) sim.step(SIM_DT, g.x, g.y);
      renderer.render(sim.particles, {
        color: latest.current.color,
        deep: latest.current.deep,
        temp: latest.current.tempColor,
        pointSize,
        time,
      });
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
    };
  }, [canvasRef, active, gravity]);
}
