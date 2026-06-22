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
import { isPlausibleRoll, recordFromPhysical, toRollRecord, physicalRecordApplies, type ParserResult, type RollRecord } from "../../domain/dice";

/** Gold dice tuned to Molten Hoard; tray physics tuned in the spike. */
const THEME_COLOR = "#e8b45a";

/** Where the vendored engine + assets live, honouring the Pages subpath (BASE_URL). */
function dicePath(file: string): string {
  return `${import.meta.env.BASE_URL}dice/${file}`;
}

/**
 * Indirect dynamic import. The engine is a `/public` file (served as-is, with its
 * own worker), not a source module — Vite must NOT try to resolve it from the
 * module graph (it would fail / try to bundle the worker). The `@vite-ignore`
 * annotation on the import below tells Vite to leave this `import()` alone so the
 * browser fetches it same-origin at runtime. Preferred over `new Function(...)`,
 * which is eval-like and blocked by a strict CSP (`unsafe-eval`).
 */
const importModule = (url: string): Promise<unknown> => import(/* @vite-ignore */ url);

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
  /**
   * Throw the notation; resolves with the recorded result once the dice settle +
   * reconcile. `onProgress` (if given) fires on every physics settle, INCLUDING each
   * exploding/penetrating re-roll — so a caller's safety timeout can measure idle
   * time since the last settle rather than total time since the first throw (#149).
   */
  roll: (notation: string, onProgress?: () => void) => Promise<RollRecord>;
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
/**
 * The slice of the vendored dice-box that {@link bindTray} drives. `onRollComplete`
 * is a single mutable callback slot the engine owns — a physics settle is delivered
 * to whatever handler is installed when it fires, so an abandoned throw's late event
 * lands on the *current* handler. {@link bindTray} guards against that.
 */
export interface DiceBoxLike {
  roll: (parsed: unknown) => void;
  add: (rerolls: unknown, opts?: { newStartPoint?: boolean }) => void;
  clear: () => void;
  onRollComplete: (results: unknown) => void;
}
interface DiceBoxInstance extends DiceBoxLike {
  init: () => Promise<unknown>;
}
type DiceBoxCtor = new (selector: string | HTMLElement, options: DiceBoxOptions) => DiceBoxInstance;

/** The vendored parser's surface that the roll loop uses (it ships no types). */
interface RollParser {
  parseNotation: (notation: string) => unknown;
  handleRerolls: (results: unknown) => unknown;
  parseFinalResults: (results: unknown) => ParserResult;
}

/**
 * Bind a {@link DiceTray} to a dice-box instance, owning the roll/reroll → record
 * loop AND the abandoned-roll race guard (#130, Codex P2).
 *
 * dice-box has ONE `onRollComplete` slot, replaced on each throw, and a settle event
 * is delivered to whichever handler is current — it carries no roll identity. So a
 * late settle from a throw the user abandoned (closed the tray, or the 6s safety
 * timeout fired) would otherwise resolve a *newer* throw with stale dice, and the
 * React-side `rollSeq` guard cannot tell the difference.
 *
 * Defence, in layers:
 *  - The slot is installed ONCE and routes only to the `active` throw. A throw that
 *    is superseded (a new throw) or swept (`clear`) sets `active = null`, so a late
 *    settle arriving while idle is dropped instead of re-resolving.
 *  - Each `roll()` `clear()`s the table first, so a superseded throw's physics is
 *    swept before the new throw starts (dice-box stops emitting for swept dice) and
 *    can't bleed into the new handler.
 *  - An abandoned throw's promise is rejected, never left pending.
 */
export function bindTray(box: DiceBoxLike): DiceTray {
  let active:
    | {
        resolve: (rec: RollRecord) => void;
        reject: (err: Error) => void;
        parser: RollParser;
        notation: string;
        onProgress?: () => void;
      }
    | null = null;

  box.onRollComplete = (results: unknown) => {
    const cur = active;
    if (!cur) return; // idle / abandoned throw — drop the late settle
    // A settle landed for the active throw — real progress, even if it's only the
    // first wave of an exploding chain. Signal it BEFORE deciding reroll-vs-final so
    // the caller's safety timer resets per settle, not per throw (#149).
    cur.onProgress?.();
    try {
      // Resolve rerolls (explode/reroll/penetrate) first, then record the final.
      const rerolls = cur.parser.handleRerolls(results);
      if (Array.isArray(rerolls) && rerolls.length > 0) {
        box.add(rerolls, { newStartPoint: false });
        return; // same throw still active, awaiting the post-reroll settle
      }
      active = null; // this throw is done — free the slot before resolving
      // Exploding rolls desync from the physical dice (#97) — record straight from
      // the dice the user sees; everything else keeps the parser's keep/drop path.
      const rec = physicalRecordApplies(cur.notation)
        ? recordFromPhysical(results, cur.notation)
        : toRollRecord(cur.parser.parseFinalResults(results), cur.notation);
      // Last-resort safety net: never show a malformed result.
      if (!isPlausibleRoll(rec, cur.notation)) {
        console.warn("[hoard] engine returned a malformed roll; using headless fallback", rec);
        cur.resolve(rollHeadless(cur.notation));
        return;
      }
      cur.resolve(rec);
    } catch (err) {
      active = null;
      cur.reject(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Abandon the in-flight throw: reject its promise and free the slot so its late
  // physics settle becomes a no-op.
  const abandon = () => {
    const cur = active;
    active = null;
    cur?.reject(new Error("dice roll superseded"));
  };

  return {
    roll: (notation: string, onProgress?: () => void) =>
      new Promise<RollRecord>((resolve, reject) => {
        abandon(); // a new throw supersedes any still-pending one
        box.clear(); // sweep the table so a superseded throw's dice can't bleed in
        // A FRESH parser per roll — ParserInterface carries mutable state that
        // corrupts successive rolls if reused.
        const parser = new DiceParser() as RollParser;
        active = { resolve, reject, parser, notation, onProgress };
        try {
          box.roll(parser.parseNotation(notation));
        } catch (err) {
          active = null;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
    clear: () => {
      abandon();
      box.clear();
    },
  };
}

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
  const box = new DiceBox(container, {
    assetPath: dicePath("assets/"),
    theme: "default",
    themeColor: THEME_COLOR,
    scale: 7,
    gravity: 1.4,
    // On-screen renderer (not the offscreen worker) so our vendor patch's
    // antialiasing + device-pixel-ratio apply (#81). Occasional malformed results
    // from either renderer are caught by isPlausibleRoll → headless fallback.
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

  return bindTray(box);
}
