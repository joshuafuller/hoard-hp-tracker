/**
 * Dice engine adapter — bridges the chip selection / notation to a {@link RollRecord}.
 *
 * Two paths share one result shape:
 *  - `rollHeadless` rolls entirely in the parser (no WebGL) — used for reduced-motion
 *    or when the 3D engine is unavailable. Deterministic if given floats; testable.
 *  - `createDiceTray` lazy-loads the vendored `@3d-dice/dice-box` (BabylonJS + Ammo)
 *    and rolls with physics, reconciling rerolls before recording. WebGL — covered by e2e.
 *
 * The engine is loaded from the SAME-ORIGIN vendored copy (`public/dice/`, see
 * `scripts/vendor-dice.mjs`) so its worker + assets resolve correctly and are
 * precached for offline (#45). It is dynamic-imported on first tray open only.
 */
// @ts-expect-error — the parser ships no types
import DiceParser from "@3d-dice/dice-parser-interface";
import { toRollRecord, type RollRecord } from "../../domain/dice";

/** Gold dice tuned to Molten Hoard; tray physics tuned in the spike. */
const THEME_COLOR = "#e8b45a";

/** Where the vendored engine + assets live, honouring the Pages subpath (BASE_URL). */
function dicePath(file: string): string {
  return `${import.meta.env.BASE_URL}dice/${file}`;
}

/**
 * Indirect dynamic import. The engine is a `/public` file (served as-is, with its
 * own worker), not a source module — a literal `import()` makes Vite's dev server
 * try to resolve it from the module graph and fail. Routing through `Function`
 * hides the URL from Vite so the browser fetches it same-origin at runtime.
 */
const importModule = new Function("url", "return import(url)") as (url: string) => Promise<unknown>;

interface DieGroup {
  qty: number;
  sides: number | "fate";
}

/** An exact float for one die of `sides`, so the parser's `round(float*sides)+1`
 * yields a uniform [1, sides] (a raw `Math.random()` can round up to `sides+1`). */
function floatFor(sides: number | "fate"): number {
  if (sides === "fate") {
    const v = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
    return (v + 2) * 0.25;
  }
  const v = Math.floor(Math.random() * sides) + 1;
  return (v - 1) / sides;
}

/**
 * Build the floats the parser's RNG consumes: one exact float per initial die,
 * plus — for a single-die-size pool — a buffer of extra exact floats so EXPLODING
 * / reroll dice keep drawing correct values instead of falling back to the parser's
 * buggy `Math.random` (which both overshoots AND desyncs the total from the dice).
 */
function randomFloatsFor(groups: DieGroup[]): number[] {
  const out: number[] = [];
  for (const g of groups) {
    for (let i = 0; i < g.qty; i++) out.push(floatFor(g.sides));
  }
  // Explosions/rerolls draw more of the SAME die when the pool is one size (the
  // common case, e.g. 3d6!). 64 is well past any realistic explosion chain.
  const sizes = new Set(groups.map((g) => String(g.sides)));
  if (sizes.size === 1 && groups[0]) {
    for (let i = 0; i < 64; i++) out.push(floatFor(groups[0].sides));
  }
  return out;
}

/**
 * Roll without physics, entirely in the parser. Pass `floats` (= `(value-1)/sides`)
 * for a deterministic result; omit for a real uniform roll. This is the
 * reduced-motion / no-engine path and is unit-tested. (Exploding/reroll dice beyond
 * the initial set are rare here and degrade to the parser's own fallback.)
 */
export function rollHeadless(notation: string, floats?: number[]): RollRecord {
  const parser = new DiceParser();
  const groups = parser.parseNotation(notation) as DieGroup[];
  parser.rollsAsFloats = floats ?? randomFloatsFor(groups);
  const result = parser.rollNotation(parser.parsedNotation);
  return toRollRecord(result, notation);
}

/** A live 3D dice tray bound to a container element. */
export interface DiceTray {
  /** Throw the notation; resolves with the recorded result once the dice settle + reconcile. */
  roll: (notation: string) => Promise<RollRecord>;
  /** Clear the dice from the tray. */
  clear: () => void;
}

interface DiceBoxOptions {
  assetPath: string;
  theme: string;
  themeColor: string;
  scale: number;
  gravity: number;
  offscreen?: boolean;
}
interface DiceBoxInstance {
  init: () => Promise<unknown>;
  roll: (parsed: unknown) => void;
  add: (rerolls: unknown, opts?: { newStartPoint?: boolean }) => void;
  clear: () => void;
  onRollComplete: (results: unknown) => void;
}
type DiceBoxCtor = new (selector: string | HTMLElement, options: DiceBoxOptions) => DiceBoxInstance;

/**
 * Lazy-load + init a 3D dice tray in `container`. Heavy (BabylonJS); call only on
 * the first tray open. Reuses one parser instance (rolls are sequential; the parser
 * resets its own state on each `parseNotation`).
 */
export async function createDiceTray(container: string | HTMLElement): Promise<DiceTray> {
  // Vendored, same-origin import so the worker/assets resolve (a bundled import
  // would break the worker path); the indirect import keeps Vite out of it.
  const mod = (await importModule(dicePath("dice-box.es.min.js"))) as { default: DiceBoxCtor };
  const DiceBox = mod.default;
  const parser = new DiceParser();
  const box = new DiceBox(container, {
    assetPath: dicePath("assets/"),
    theme: "default",
    themeColor: THEME_COLOR,
    scale: 7,
    gravity: 1.4,
    // Use the on-screen renderer (not the offscreen worker): it exposes the engine
    // options we patch for quality (antialiasing + device-pixel-ratio) in
    // scripts/vendor-dice.mjs. Fine for a tray that rolls occasionally.
    offscreen: false,
  });
  await box.init();

  // dice-box only refits on a `window` resize event — it ignores the canvas
  // changing size on its own (tray opening from display:none, safe-area, device
  // rotation). Observe the container and nudge dice-box to refit so the buffer
  // always matches the display (correct aspect) and the physics walls sit at the
  // real edges (dice never roll off-screen).
  const target = typeof container === "string" ? document.querySelector<HTMLElement>(container) : container;
  if (target && typeof ResizeObserver !== "undefined") {
    let raf = 0;
    const ro = new ResizeObserver(() => {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
      const fire = () => window.dispatchEvent(new Event("resize"));
      raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame(fire) : (fire(), 0);
    });
    ro.observe(target);
  }

  return {
    roll: (notation: string) =>
      new Promise<RollRecord>((resolve, reject) => {
        // Resolve rerolls (explode/reroll/penetrate) first, then record the final.
        box.onRollComplete = (results: unknown) => {
          try {
            const rerolls = parser.handleRerolls(results);
            if (Array.isArray(rerolls) && rerolls.length > 0) {
              box.add(rerolls, { newStartPoint: false });
              return;
            }
            const final = parser.parseFinalResults(results);
            resolve(toRollRecord(final, notation));
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        };
        try {
          box.roll(parser.parseNotation(notation));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    clear: () => box.clear(),
  };
}
