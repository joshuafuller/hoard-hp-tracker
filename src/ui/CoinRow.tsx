import type { CoinKind } from "../domain/coins";
import { Stepper } from "./controls";
import { haptic } from "../sound/haptics";

export interface CoinRowProps {
  kind: CoinKind;
  /** Full denomination name, e.g. "Gold". */
  label: string;
  /** Abbreviation, e.g. "gp". */
  unit: string;
  count: number;
  /** Whether a spend of one is possible (purse can cover it via conversion). */
  canSpend: boolean;
  /** Add one coin of this kind. */
  onAdd: () => void;
  /** Spend one coin of this kind (converts across denominations when short). */
  onSpend: () => void;
  /** Open the keypad to add/spend/set a larger amount. */
  onEdit: () => void;
}

/**
 * One denomination row: a colour-coded coin, inline −/+ steppers for quick
 * single-coin nudges, and a tappable count that opens the keypad for larger
 * Add/Spend/Set amounts. Presentational — all mutation flows through the props.
 */
export function CoinRow({ kind, label, unit, count, canSpend, onAdd, onSpend, onEdit }: CoinRowProps) {
  const tap = (fn: () => void) => () => {
    haptic("tap");
    fn();
  };
  return (
    <div className="coin-row" data-kind={kind}>
      <span className="coin-row__name">
        <span className="coin-row__dot" aria-hidden="true" />
        <span className="coin-row__label">{label}</span>
        <span className="coin-row__unit">{unit}</span>
      </span>
      <Stepper
        className="coin-row__controls"
        label={label}
        decLabel={`Spend 1 ${label}`}
        incLabel={`Add 1 ${label}`}
        decDisabled={!canSpend}
        onDec={tap(onSpend)}
        onInc={tap(onAdd)}
      >
        <button
          type="button"
          className="coin-row__count"
          aria-label={`${label} — ${count} ${unit}, edit`}
          onClick={tap(onEdit)}
        >
          {count}
        </button>
      </Stepper>
    </div>
  );
}
