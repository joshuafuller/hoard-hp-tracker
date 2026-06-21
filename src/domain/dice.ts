/**
 * Pure dice domain — framework-free (no React, Dexie, DOM, or randomness).
 *
 * Two jobs: turn a chip selection into Roll20 notation, and normalize the
 * parser's result tree into Hoard's recorded roll model. The physics roll
 * (dice-box) and the parse/roll engine (`@3d-dice/dice-parser-interface`) live in
 * the UI/engine layer; everything here is deterministic and unit-tested.
 *
 * Pre-flight (plan §0) established the parser returns an `expressionroll` tree:
 * `.value` is the grand total, and every die lives in a `.rolls[]` somewhere in
 * the tree as `{die: sides, value, valid, drop}`. `toRollRecord` walks that tree,
 * so the same function serves both the animated path (dice-box values fed into the
 * parser) and the headless / reduced-motion path (parser rolls standalone).
 */

/** How a d20 is thrown: a single die, or two-keep-highest / two-keep-lowest. */
export type RollMode = "normal" | "advantage" | "disadvantage";

/** A roll chosen from the tray's chips: N dice of one size, a signed modifier. */
export interface DiceSelection {
  /** Number of dice (≥ 1). */
  count: number;
  /** Die faces (4, 6, 8, 10, 12, 20, 100). */
  sides: number;
  /** Signed integer added to the total. */
  modifier: number;
  /** Defaults to "normal"; advantage/disadvantage force `2dXkh1`/`2dXkl1`. */
  mode?: RollMode;
}

/** One physical die that landed, with its kept/dropped flag. */
export interface RolledDie {
  sides: number;
  value: number;
  dropped: boolean;
  /** True if this die triggered an explosion (the next die in sequence is its result). */
  exploded?: boolean;
}

/** A recorded roll: the notation thrown, the grand total, the kept result, every die. */
export interface RollRecord {
  notation: string;
  total: number;
  result: number[];
  dice: RolledDie[];
}

/** A single die entry inside a parser `rolls[]` array. */
interface ParserRollEntry {
  die?: number;
  value: number;
  valid?: boolean;
  drop?: boolean;
  explode?: boolean;
}

/** The parser's `expressionroll` result tree (only the fields we read are typed). */
export interface ParserResult {
  value: number;
  [key: string]: unknown;
}

/** Format a signed modifier as a notation suffix: `+5`, `-1`, or "" for zero. */
function modifierSuffix(modifier: number): string {
  const m = Math.trunc(modifier);
  if (m === 0) return "";
  return m > 0 ? `+${m}` : `${m}`;
}

/**
 * Build Roll20 notation from a chip selection. Advantage/disadvantage always mean
 * two dice keep-highest/lowest-one (ignoring count — the 5e rule), with the
 * modifier appended after the keep clause.
 */
export function buildNotation(sel: DiceSelection): string {
  const sides = Math.trunc(sel.sides);
  const suffix = modifierSuffix(sel.modifier);
  if (sel.mode === "advantage") return `2d${sides}kh1${suffix}`;
  if (sel.mode === "disadvantage") return `2d${sides}kl1${suffix}`;
  const count = Math.max(1, Math.trunc(sel.count));
  return `${count}d${sides}${suffix}`;
}

/** One group in a built dice pool: N dice of a given size. */
export interface DiePoolGroup {
  sides: number;
  count: number;
}

/** A built dice pool — groups in tap order (so the notation reads as built). */
export type DiePool = DiePoolGroup[];

/** Add one die of `sides` to the pool (incrementing its group, preserving order). */
export function addToPool(pool: DiePool, sides: number): DiePool {
  if (pool.some((g) => g.sides === sides)) {
    return pool.map((g) => (g.sides === sides ? { ...g, count: g.count + 1 } : g));
  }
  return [...pool, { sides, count: 1 }];
}

/** Remove one die of `sides` (decrement; drop the group at zero; absent is a no-op). */
export function removeFromPool(pool: DiePool, sides: number): DiePool {
  return pool
    .map((g) => (g.sides === sides ? { ...g, count: g.count - 1 } : g))
    .filter((g) => g.count > 0);
}

/** Advantage/disadvantage is the 5e d20 keep-high/low — valid only for a lone d20. */
export function advantageApplies(pool: DiePool): boolean {
  return pool.length === 1 && pool[0]!.sides === 20 && pool[0]!.count === 1;
}

/**
 * Build Roll20 notation from a pool + modifier. A lone d20 with advantage/
 * disadvantage becomes `2d20kh1`/`2d20kl1`; otherwise the mode is ignored (you
 * can't have "advantage on 3d6"). An empty pool yields "".
 */
export function poolToNotation(pool: DiePool, modifier: number, mode: RollMode): string {
  const suffix = modifierSuffix(modifier);
  if (mode !== "normal" && advantageApplies(pool)) {
    const keep = mode === "advantage" ? "kh1" : "kl1";
    return `2d20${keep}${suffix}`;
  }
  if (pool.length === 0) return "";
  return pool.map((g) => `${g.count}d${g.sides}`).join("+") + suffix;
}

/** A die is dropped if the parser flags it `drop` or marks it `valid === false`. */
function isDropped(entry: ParserRollEntry): boolean {
  return !!(entry.drop || entry.valid === false);
}

/**
 * Collect every die from a parser result tree by gathering all `rolls[]` arrays
 * anywhere in the structure (mirrors the parser's own `recursiveSearch("rolls")`).
 */
function collectDice(node: unknown, out: RolledDie[]): void {
  if (!node || typeof node !== "object") return;
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "rolls" && Array.isArray(value)) {
      for (const entry of value as ParserRollEntry[]) {
        const die: RolledDie = {
          sides: entry.die ?? 0,
          value: entry.value,
          dropped: isDropped(entry),
        };
        if (entry.explode) die.exploded = true;
        out.push(die);
      }
    } else if (value && typeof value === "object") {
      collectDice(value, out);
    }
  }
}

/** Sum every literal modifier (`type: "number"`) node in the parser tree. */
function sumModifiers(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const obj = node as Record<string, unknown>;
  let sum = 0;
  if (obj.type === "number" && typeof obj.value === "number" && Number.isFinite(obj.value)) {
    sum += obj.value;
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") sum += sumModifiers(value);
  }
  return sum;
}

/**
 * Normalize a parser result tree into a {@link RollRecord}: the total is the
 * tree's grand `value`, the dice are every landed die with its kept/dropped flag,
 * and the result is just the kept dice.
 *
 * Defensive: the 3D engine occasionally returns a die without a value on huge
 * pools (seen on 100d20), which would make the total `NaN`. We drop any non-finite
 * die and, if the parser's grand total is itself non-finite, recompute it from the
 * kept dice plus the literal modifiers — so a roll never displays `NaN`.
 */
export function toRollRecord(result: ParserResult, notation: string): RollRecord {
  const all: RolledDie[] = [];
  collectDice(result, all);
  const dice = all.filter((d) => Number.isFinite(d.value));
  const kept = dice.filter((d) => !d.dropped).map((d) => d.value);
  const total = Number.isFinite(result.value)
    ? result.value
    : kept.reduce((a, b) => a + b, 0) + sumModifiers(result);
  return { notation, total, result: kept, dice };
}
