/** Pure coin math for the four tracked denominations. Integer counts, never
 * negative. Spending auto-converts across denominations so total wealth is
 * conserved: a higher coin is broken into change when the spent denomination
 * runs short, and lower coins are combined to cover any remaining shortfall.
 * No I/O — mirrors the other domain modules. */

export type CoinKind = "pp" | "gp" | "sp" | "cp";
export interface Coins {
  pp: number;
  gp: number;
  sp: number;
  cp: number;
}

/** Value of one coin of each kind, in copper (the base unit). */
const CP_VALUE: Record<CoinKind, number> = { pp: 1000, gp: 100, sp: 10, cp: 1 };

/** Denominations from highest to lowest value. */
const KINDS: CoinKind[] = ["pp", "gp", "sp", "cp"];

const norm = (n: number) => Math.max(0, Math.trunc(n));

/** Total wealth in copper (the base unit everything converts through). */
export function totalCp(c: Coins): number {
  return c.pp * CP_VALUE.pp + c.gp * CP_VALUE.gp + c.sp * CP_VALUE.sp + c.cp * CP_VALUE.cp;
}

export function addCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(c[kind] + Math.trunc(n)) };
}

export function setCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(n) };
}

/**
 * Spend `n` coins of `kind`, converting across denominations as needed so the
 * purse never goes negative and total wealth is conserved:
 *   1. pay what you can from `kind` itself;
 *   2. break higher coins (smallest sufficient first), returning the change as `kind`
 *      — e.g. spending 1 sp from 1 gp leaves 9 sp;
 *   3. otherwise combine lower coins (largest first) to make up the rest.
 * If the whole purse can't cover the spend it is left unchanged (the spend is
 * rejected rather than going negative).
 */
export function spendCoin(c: Coins, kind: CoinKind, n: number): Coins {
  const want = Math.trunc(n);
  if (want <= 0) return { ...c };
  if (totalCp(c) < want * CP_VALUE[kind]) return { ...c }; // insufficient funds — no-op

  const out: Coins = { ...c };

  // 1. Pay what we can from the spent denomination itself.
  const fromKind = Math.min(out[kind], want);
  out[kind] -= fromKind;
  let owedCp = (want - fromKind) * CP_VALUE[kind]; // value still to remove

  // 2. Break higher coins; the change comes back as `kind`. Prefer the smallest
  //    *single* higher coin that on its own covers what's still owed, so a
  //    sufficient larger coin is broken without first disturbing the smaller
  //    higher coins (spending 15 sp from 1 gp + 1 pp breaks the pp and keeps the
  //    gp — leaving 1 gp + 85 sp, not 95 sp). Only when no single higher coin is
  //    enough do we chip away from the largest available coin, which shrinks the
  //    debt fastest until the remainder fits in one break.
  const higher = KINDS.slice(0, KINDS.indexOf(kind)); // [highest … just above `kind`]
  while (owedCp > 0) {
    // Smallest (closest to `kind`) higher coin whose single value covers the debt.
    let broke = false;
    for (let i = higher.length - 1; i >= 0; i--) {
      const hk = higher[i]!;
      if (out[hk] > 0 && CP_VALUE[hk] >= owedCp) {
        out[hk] -= 1;
        out[kind] += (CP_VALUE[hk] - owedCp) / CP_VALUE[kind]; // exact: kind divides every higher coin
        owedCp = 0;
        broke = true;
        break;
      }
    }
    if (broke) break;
    // No single higher coin suffices — break one of the largest available.
    let chipped = false;
    for (let i = 0; i < higher.length; i++) {
      const hk = higher[i]!;
      if (out[hk] > 0) {
        out[hk] -= 1;
        owedCp -= CP_VALUE[hk];
        chipped = true;
        break;
      }
    }
    if (!chipped) break; // no higher coins left — fall through to combining lower coins
  }

  // 3. Combine lower coins, largest first, to cover any remaining shortfall.
  for (let i = KINDS.indexOf(kind) + 1; i < KINDS.length && owedCp > 0; i++) {
    const lk = KINDS[i]!;
    const used = Math.min(out[lk], Math.ceil(owedCp / CP_VALUE[lk]));
    out[lk] -= used;
    owedCp -= used * CP_VALUE[lk];
  }

  return out;
}

/** Total wealth expressed in gold: 1 pp = 10 gp, 10 sp = 1 gp, 100 cp = 1 gp. */
export function totalGp(c: Coins): number {
  return totalCp(c) / CP_VALUE.gp;
}
