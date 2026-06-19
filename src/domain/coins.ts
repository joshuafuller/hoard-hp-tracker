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

  // 2. Break higher coins, smallest sufficient first; the change comes back as `kind`.
  for (let i = KINDS.indexOf(kind) - 1; i >= 0 && owedCp > 0; i--) {
    const hk = KINDS[i]!;
    while (out[hk] > 0 && owedCp > 0) {
      out[hk] -= 1;
      const gained = CP_VALUE[hk];
      if (gained >= owedCp) {
        out[kind] += (gained - owedCp) / CP_VALUE[kind]; // exact: kind divides every higher coin
        owedCp = 0;
      } else {
        owedCp -= gained;
      }
    }
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
