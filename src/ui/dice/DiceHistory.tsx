import type { DiceRollRecord, RollContext } from "../../store/db";

export interface DiceHistoryProps {
  rolls: DiceRollRecord[];
  onClear: () => void;
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

/**
 * The roll log: recent rolls newest-first (notation + per-die + total), each
 * tagged with its context, plus a clear action. Presentational — ordering and
 * persistence live in `useDiceHistory`.
 */
export function DiceHistory({ rolls, onClear }: DiceHistoryProps) {
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
              <span className="dice-history__notation">{r.notation}</span>
              <span className="dice-history__dice">
                {diceSummary(r)}
                {ctx ? ` · ${ctx}` : ""}
              </span>
              <b className="dice-history__total">{r.total}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
