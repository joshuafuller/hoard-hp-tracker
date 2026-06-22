import { useEffect, useState } from "react";
import type { DiceRollRecord, RollContext } from "../../store/db";
import { relativeTime } from "./relativeTime";
import { Glyph } from "../icons/Glyph";
import { IconButton } from "../controls";

export interface DiceHistoryProps {
  rolls: DiceRollRecord[];
  onClear: () => void;
  /** Close the log panel (back to the dice dock). */
  onClose: () => void;
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
 * The roll log: a header with a close X, the recent rolls (notation + per-die +
 * total, each timestamped with clock time + relative "how long ago"), and a Clear
 * control in the footer (kept separate from the close X). The relative labels tick
 * every 30s while open. Presentational — ordering/persistence live in `useDiceHistory`.
 */
export function DiceHistory({ rolls, onClear, onClose, now }: DiceHistoryProps) {
  const [tick, setTick] = useState(() => now ?? Date.now());
  useEffect(() => {
    if (now !== undefined) return; // fixed clock (tests)
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [now]);
  const nowMs = now ?? tick;

  return (
    <div className="dice-history">
      <div className="dice-history__head">
        <span className="dice-history__title">Recent rolls</span>
        <IconButton variant="ghost" aria-label="Close log" onClick={onClose}>
          <Glyph name="close" />
        </IconButton>
      </div>

      {rolls.length === 0 ? (
        <p className="dice-history__empty">No rolls yet — throw some dice.</p>
      ) : (
        <>
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
          <div className="dice-history__foot">
            <button type="button" className="dice-history__clear" onClick={onClear}>
              Clear history
            </button>
          </div>
        </>
      )}
    </div>
  );
}
