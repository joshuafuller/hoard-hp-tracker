import { useEffect, useState } from "react";
import type { DiceRollRecord, RollContext } from "../../store/db";
import { relativeTime } from "./relativeTime";

export interface DiceHistoryProps {
  rolls: DiceRollRecord[];
  onClear: () => void;
  /** Injectable clock for tests; live (ticking) otherwise. */
  now?: number;
}

const CONTEXT_LABEL: Record<RollContext, string> = {
  "ad-hoc": "",
  "death-save": "death save",
  "hit-die": "Hit Die",
};

/** Compact per-die summary, dropped dice in parentheses (mirrors the result line). */
function diceSummary(r: DiceRollRecord): string {
  return r.dice.map((d) => (d.dropped ? `(${d.value})` : `${d.value}`)).join(" · ");
}

/** Wall-clock time of a roll, e.g. "7:34 PM" (locale-aware). */
function clock(atMs: number): string {
  return new Date(atMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * The roll log: recent rolls newest-first (notation + per-die + total), each
 * timestamped with the wall-clock time and a relative "how long ago" so past
 * rolls are easy to find. The relative label ticks every 30s while open.
 * Presentational — ordering/persistence live in `useDiceHistory`.
 */
export function DiceHistory({ rolls, onClear, now }: DiceHistoryProps) {
  const [tick, setTick] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) return; // fixed clock (tests)
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [now]);
  const nowMs = now ?? tick;

  if (rolls.length === 0) {
    return (
      <div className="dice-history dice-history--empty">
        <p className="dice-history__empty">No rolls yet — throw some dice.</p>
      </div>
    );
  }
  return (
    <div className="dice-history">
      <div className="dice-history__head">
        <span className="dice-history__title">Recent rolls</span>
        <button type="button" className="dice-history__clear" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="dice-history__list">
        {rolls.map((r) => {
          const ctx = CONTEXT_LABEL[r.context];
          return (
            <li key={r.id} className="dice-history__item">
              <div className="dice-history__line">
                <span className="dice-history__notation">{r.notation}</span>
                <b className="dice-history__total">{r.total}</b>
              </div>
              <div className="dice-history__meta">
                <span className="dice-history__dice">
                  {diceSummary(r)}
                  {ctx ? ` · ${ctx}` : ""}
                </span>
                <span className="dice-history__time">
                  {clock(r.at)} · {relativeTime(r.at, nowMs)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
