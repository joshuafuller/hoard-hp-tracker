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
  /** called if WebGL2 can't actually be initialised, so the caller can fall back */
  onUnsupported?: () => void;
}

const SUBSTEPS = 3;
const SIM_DT = 0.006;
const MAX_DPR = 2;

/**
 * Owns the fluid sim, the WebGL renderer, and the animation loop. Particle counts
 * track HP and temp-HP as volume (drain on damage, pour on heal, splash on
 * change). Rebuilds the sim geometry on canvas resize / orientation change, and
 * pauses when the tab is hidden.
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
      latest.current.onUnsupported?.(); // flip the caller to its static fallback
      return;
    }

    let sim: Sph | null = null;
    let pointSize = 0;
    let lastHp = 0;
    let lastTemp = 0;

    const tempTarget = (cap: number) => Math.min(cap, Math.round(latest.current.tempRatio * cap));
    const hpTarget = (cap: number, temp: number) => Math.min(cap - temp, Math.round(latest.current.ratio * cap));

    // (Re)build the sim + canvas backing store for the current CSS size. Called
    // on first layout and whenever the element resizes (rotation, split-view…).
    const build = () => {
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
      const cssSize = canvas.clientWidth;
      if (!cssSize) return; // not laid out yet; the observer will fire again
      const px = Math.round(cssSize * dpr);
      if (px === canvas.width && sim) return; // unchanged
      canvas.width = px;
      canvas.height = px;
      renderer.resize(px, px);
      const radius = px * 0.5;
      const h = Math.max(8, radius * 0.135);
      sim = new Sph({ cx: px / 2, cy: px / 2, radius, params: { h } });
      pointSize = h * 3.0;
      const cap = sim.capacity;
      const temp = tempTarget(cap);
      sim.setTempCount(temp);
      sim.setCount(hpTarget(cap, temp));
      for (let i = 0; i < 40; i++) sim.step(SIM_DT, 0, 1);
      lastHp = sim.countOf(0);
      lastTemp = sim.countOf(1);
    };
    build();

    let raf = 0;
    let running = true;
    let time = 0;

    const frame = () => {
      if (!running) return;
      if (!sim) {
        build();
        if (!sim) {
          raf = requestAnimationFrame(frame);
          return;
        }
      }
      time += 1 / 60;
      const cap = sim.capacity;
      const ease = Math.max(1, Math.ceil(cap * 0.05));

      // temp claims its share first; HP eases into the remaining room
      const tempWant = tempTarget(cap);
      const haveTemp = sim.countOf(1);
      if (tempWant !== haveTemp) {
        sim.setTempCount(haveTemp + Math.sign(tempWant - haveTemp) * Math.min(ease, Math.abs(tempWant - haveTemp)));
      }
      const hpWant = hpTarget(cap, tempWant);
      const haveHp = sim.countOf(0);
      if (hpWant !== haveHp) {
        sim.setCount(haveHp + Math.sign(hpWant - haveHp) * Math.min(ease, Math.abs(hpWant - haveHp)));
      }

      // a jolt of slosh whenever the player's HP/temp target jumps (damage/heal)
      const delta = Math.abs(hpWant - lastHp) + Math.abs(tempWant - lastTemp);
      if (delta > 0) {
        sim.splash(Math.min(420, 90 + delta * 6));
        lastHp = hpWant;
        lastTemp = tempWant;
      }

      const g = latest.current.gravity.current;
      for (let st = 0; st < SUBSTEPS; st++) sim.step(SIM_DT, g.x, g.y);
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

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => build());
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", build);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro?.disconnect();
      window.removeEventListener("resize", build);
      renderer.dispose();
    };
  }, [canvasRef, active, gravity]);
}
