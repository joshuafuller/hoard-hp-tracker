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
 * The settled roll readout, presented as one cohesive bounded plate (so it stays
 * legible over the tumbling dice instead of as loose floating text): the grand
 * total (Fraunces), the notation, every die as a chip (dropped dice struck), and
 * an optional manual Apply-as-heal. Presentational.
 */
export function DiceResult({ record, onApplyHeal, heal = false }: DiceResultProps) {
  return (
    <div className="dice-result" data-heal={heal}>
      <div className="dice-result__plate">
        <div className="dice-result__total">{record.total}</div>
        <div className="dice-result__notation">{record.notation}</div>
        <div className="dice-result__dice">
          {record.dice.map((d, i) => {
            // Nat 1 / nat 20 on a d20 are gameplay-critical — outline ruby / emerald.
            const crit = d.sides === 20 && d.value === 20 ? "hit" : d.sides === 20 && d.value === 1 ? "miss" : undefined;
            // One "+" each time the explosion round INCREASES (so a normal die group
            // following an explosion, e.g. 1d6!+1d4, doesn't get a spurious "+").
            const added = i > 0 && (d.round ?? 1) > (record.dice[i - 1]?.round ?? 1);
            return (
              <span key={i} className="dice-result__chipwrap">
                {added && <span className="dice-result__plus" aria-hidden="true">+</span>}
                <span
                  className="dice-result__chip"
                  data-testid={`die-${i}`}
                  data-dropped={d.dropped}
                  data-crit={crit}
                >
                  {d.dropped ? <s>{d.value}</s> : d.value}
                </span>
              </span>
            );
          })}
        </div>
        {onApplyHeal && (
          <button type="button" className="dice-applyheal" onClick={() => onApplyHeal(record.total)}>
            <Glyph name="heal" />
            Apply as heal
          </button>
        )}
      </div>
    </div>
  );
}
