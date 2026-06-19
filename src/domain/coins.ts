/** Pure coin math for the three tracked denominations. Integer counts, never
 * negative. No I/O — mirrors the other domain modules. */

export type CoinKind = "gp" | "sp" | "cp";
export interface Coins {
  gp: number;
  sp: number;
  cp: number;
}

const norm = (n: number) => Math.max(0, Math.trunc(n));

export function addCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(c[kind] + Math.trunc(n)) };
}

export function spendCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(c[kind] - Math.trunc(n)) };
}

export function setCoin(c: Coins, kind: CoinKind, n: number): Coins {
  return { ...c, [kind]: norm(n) };
}

/** Total wealth expressed in gold: 10 sp = 1 gp, 100 cp = 1 gp. */
export function totalGp(c: Coins): number {
  return c.gp + c.sp / 10 + c.cp / 100;
}
