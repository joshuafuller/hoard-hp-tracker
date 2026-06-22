import type { CoinKind } from "../domain/coins";
import { playSfx } from "../sound/sfx";
import { Stepper } from "./controls";

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

/** Fire a short haptic pulse where supported; a silent no-op otherwise. */
function haptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(10);
}

/**
 * One denomination row: a colour-coded coin, inline −/+ steppers for quick
 * single-coin nudges, and a tappable count that opens the keypad for larger
 * Add/Spend/Set amounts. Presentational — all mutation flows through the props.
 */
export function CoinRow({ kind, label, unit, count, canSpend, onAdd, onSpend, onEdit }: CoinRowProps) {
  const tap = (fn: () => void) => () => {
    haptic();
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
        onDec={() => { playSfx("coinSpend"); tap(onSpend)(); }}
        onInc={() => { playSfx("coinAdd"); tap(onAdd)(); }}
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
