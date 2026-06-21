import type { RollRecord } from "../../domain/dice";
import { Glyph } from "../icons/Glyph";

export interface DiceResultProps {
  record: RollRecord;
  /** When provided, shows a manual "Apply as heal" button that calls back with the total. */
  onApplyHeal?: (total: number) => void;
  /** Emerald "heals you" styling (Hit Die / healing spells) vs. gold (informational). */
  heal?: boolean;
}

/**
 * The settled roll readout: the grand total (Fraunces), the notation + every die
 * (dropped dice struck), and an optional manual Apply-as-heal (ad-hoc heals; the
 * tray can't auto-tell heal from damage on identical notation). Presentational.
 */
export function DiceResult({ record, onApplyHeal, heal = false }: DiceResultProps) {
  return (
    <div className="dice-result" data-heal={heal}>
      <div className="dice-result__total">{record.total}</div>
      <div className="dice-result__expr">
        <span className="dice-result__notation">{record.notation}</span>
        <span aria-hidden="true"> → </span>
        {record.dice.map((d, i) => (
          <span key={i} className="dice-result__die" data-testid={`die-${d.value}`} data-dropped={d.dropped}>
            {d.dropped ? <s>{d.value}</s> : d.value}
            {i < record.dice.length - 1 ? <span aria-hidden="true"> · </span> : null}
          </span>
        ))}
      </div>
      {onApplyHeal && (
        <button type="button" className="dice-applyheal" onClick={() => onApplyHeal(record.total)}>
          <Glyph name="heal" />
          Apply as heal
        </button>
      )}
    </div>
  );
}
