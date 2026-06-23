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
  /** True if this die rolled its max and triggered an explosion. */
  exploded?: boolean;
  /** Explosion round (≥2); omitted for the initial round-1 dice. */
  round?: number;
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

/**
 * Normalize a dice expression so explosion/reroll modifiers precede keep/drop
 * clauses within each die term. The vendored parser silently DROPS an explosion
 * when a keep/drop clause comes first — `4d6kh3!` never explodes — but accepts the
 * reordered form `4d6!kh3` (empirically verified, #108). We only reorder a term when
 * its modifiers tokenize cleanly into known explode/reroll + keep/drop tokens; the
 * keep/drop is then moved after the explode/reroll. A term with any unrecognized token
 * is returned untouched, so we never corrupt notation we don't fully understand.
 * Applied at the parse boundary only — the displayed expression stays as the user typed.
 */
/** Each modifier pattern, paired with `isExplodeReroll` (true → explode/reroll, which
 * must precede keep/drop; false → keep/drop). A boolean (not a string tag) so the value
 * directly drives the bucket — no inert label to mutate. */
const MOD_PATTERNS: ReadonlyArray<readonly [RegExp, boolean]> = [
  [/^!!?p?(?:[<>=]+\d+|\d+)?/i, true], // explode / compound (!!) / penetrate (p) / on-N
  [/^ro?(?:[<>=]+\d+|\d+)?/i, true], // reroll / reroll-once
  [/^(?:kh|kl|dh|dl)\d*/i, false], // keep/drop highest/lowest (count optional → 1)
  [/^k\d*/i, false], // keep N (bare `k` = keep 1)
  [/^d\d*/i, false], // drop lowest N (bare `d` = drop 1)
];
/**
 * Split a die term's modifier string into its explode/reroll text and its keep/drop
 * text, preserving each group's internal order. Returns null if any token is
 * unrecognized — the caller then leaves the term exactly as typed.
 */
function splitMods(mods: string): { er: string; kd: string } | null {
  let er = "";
  let kd = "";
  let rest = mods;
  while (rest.length > 0) {
    const hit = MOD_PATTERNS.map(([re, isEr]) => [re.exec(rest), isEr] as const).find(([m]) => m?.[0]);
    if (!hit || !hit[0]) return null; // unknown token — bail
    const text = hit[0][0];
    if (hit[1]) er += text;
    else kd += text;
    rest = rest.slice(text.length);
  }
  return { er, kd };
}
export function normalizeNotation(notation: string): string {
  // Within each die term, emit explode/reroll modifiers BEFORE keep/drop — the order
  // the parser accepts (it silently drops a `!` placed after `kh`/`kl`). Always-reorder
  // is correct AND idempotent (re-ordering already-correct notation yields the same
  // string), so no "already correct?" guard is needed. A term with any unrecognized
  // token is left exactly as typed (splitMods → null). Display stays original; only the
  // parse-boundary callers normalize. (#108)
  return notation.replace(/(\d*d\d+)([a-z!{}<>=\d]*)/gi, (full: string, die: string, mods: string) => {
    const split = splitMods(mods);
    return split ? die + split.er + split.kd : full;
  });
}

/** A die is dropped if the parser flags it `drop` or marks it `valid === false`. */
function isDropped(entry: ParserRollEntry): boolean {
  return !!(entry.drop || entry.valid === false);
}

/**
 * Assign explosion ROUNDS to a die group's rolls. The parser appends explosion
 * dice at the END, batched by round: the first `count` dice are round 1; each die
 * that exploded contributes one die to the next round, and so on. So round N+1 has
 * exactly as many dice as exploded in round N. (round 1 is left implicit.)
 */
function assignRounds(rolls: ParserRollEntry[], count: number, out: RolledDie[]): void {
  let round = 1;
  let remaining = count > 0 ? count : rolls.length; // dice left in the current round
  let exploded = 0; // explosions seen this round → size of the next round
  for (const entry of rolls) {
    const die: RolledDie = {
      sides: entry.die ?? 0,
      value: entry.value,
      dropped: isDropped(entry),
    };
    if (entry.explode) {
      die.exploded = true;
      exploded++;
    }
    if (round > 1) die.round = round;
    out.push(die);
    remaining--;
    if (remaining === 0 && exploded > 0) {
      round++;
      remaining = exploded;
      exploded = 0;
    }
  }
}

/**
 * Collect every die from a parser result tree. Each die-group node carries its
 * initial `count` and a flat `rolls[]` (initial dice + explosion rounds appended);
 * {@link assignRounds} tags each die with its explosion round.
 */
function collectDice(node: unknown, out: RolledDie[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.rolls)) {
    const count = (obj.count as { value?: number } | undefined)?.value;
    assignRounds(obj.rolls as ParserRollEntry[], typeof count === "number" ? count : obj.rolls.length, out);
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === "rolls") continue; // already handled (with round batching)
    if (value && typeof value === "object") collectDice(value, out);
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
/** True if `notation` asks for at least one die (vs. a bare modifier like "+5"). */
export function notationHasDice(notation: string): boolean {
  return /d[\df%]/i.test(notation);
}

/**
 * Sanity-check a recorded roll against its notation. The 3D engine intermittently
 * returns a malformed result (a finite-but-bogus total with NO dice — observed as a
 * static "21" on a re-rolled 1d20); the engine adapter uses this to detect that and
 * fall back to a clean headless roll. Pure + unit-tested.
 */
export function isPlausibleRoll(rec: RollRecord, notation: string): boolean {
  if (!Number.isFinite(rec.total)) return false;
  if (notationHasDice(notation) && rec.dice.length === 0) return false;
  return true;
}

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

/**
 * Sum the standalone integer terms in a notation (the `+N` / `-N` modifiers),
 * ignoring dice/keep terms like `8d6` or `kh1`. Used to add the flat modifier when
 * building a record from physical dice (which carry no modifier node).
 */
export function notationModifier(notation: string): number {
  let mod = 0;
  for (const term of notation.match(/[+-]?[^+-]+/g) ?? []) {
    const m = /^([+-]?)(\d+)$/.exec(term.replace(/\s+/g, "")); // tolerate "8d6! + 3"
    if (m) mod += (m[1] === "-" ? -1 : 1) * Number(m[2]);
  }
  return mod;
}

/**
 * Whether the engine should build the record from the PHYSICAL dice
 * ({@link recordFromPhysical}) rather than the parser. True only for additive
 * exploding rolls: the parser desyncs once dice are added (#97), but keep/drop and
 * success-count notations need the parser's semantics (physical dice carry no
 * drop/valid flags), so those stay on the parser path even when they also explode.
 */
export function physicalRecordApplies(notation: string): boolean {
  // Keep/drop needs the parser's semantics (physical dice carry no drop flags), so route
  // ANY keep/drop away from the physical path — incl. bare `k`/`d` (count defaults to 1),
  // not just `kh`/`kl`/`dh`/`dl`. `d(?![\df])` matches a drop `d` (followed by end/!/+,
  // not a digit and not the `F` of a Fudge die `dF`) without matching the die's own
  // `d<sides>`. (A drop WITH a count, `d2`, is ambiguous with the die and stays on the
  // physical path — tracked in #186.)
  return notation.includes("!") && !/k|d(?![\df])|[<>]/i.test(notation);
}

/** The explosion round encoded in a physical die's rollId: integer ⇒ 1; `"X.n"` ⇒ n+1. */
function roundOfRollId(rollId: number | string): number {
  const dot = String(rollId).split(".");
  return dot.length < 2 ? 1 : Number(dot[1]) + 1;
}

interface PhysicalRoll {
  rollId: number | string;
  sides: number;
  value: number;
}

/** Gather the physical dice (with their `rollId`) from a dice-box results tree. */
function collectPhysical(node: unknown, out: PhysicalRoll[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  if (Array.isArray(obj.rolls)) {
    for (const r of obj.rolls as Array<Record<string, unknown>>) {
      if (r && typeof r.value === "number") {
        out.push({ rollId: (r.rollId as number | string) ?? 0, sides: Number(r.sides) || 0, value: r.value });
      }
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (key === "rolls") continue;
    if (value && typeof value === "object") collectPhysical(value, out);
  }
}

/**
 * Build a {@link RollRecord} from the PHYSICAL dice-box results — the dice the user
 * actually sees on the table — instead of the parser's re-roll, which desyncs from
 * physics / returns garbage on explosions (#97). Values come straight from physics;
 * rounds from each die's `rollId` (`"2.1"` ⇒ round 2); the modifier from the notation.
 * For additive / exploding rolls — keep/drop semantics still route through the parser.
 */
export function recordFromPhysical(results: unknown, notation: string): RollRecord {
  const physical: PhysicalRoll[] = [];
  collectPhysical(results, physical);
  const explodes = notation.includes("!");
  const dice: RolledDie[] = physical.map((r) => {
    const round = roundOfRollId(r.rollId);
    const die: RolledDie = { sides: r.sides, value: r.value, dropped: false };
    if (round > 1) die.round = round;
    if (explodes && r.value === r.sides) die.exploded = true;
    return die;
  });
  // round-1 dice first, then round 2, … (stable within a round) so the "+" reads right.
  dice.sort((a, b) => (a.round ?? 1) - (b.round ?? 1));
  const kept = dice.filter((d) => !d.dropped).map((d) => d.value);
  const total = kept.reduce((a, b) => a + b, 0) + notationModifier(notation);
  return { notation, total, result: kept, dice };
}
