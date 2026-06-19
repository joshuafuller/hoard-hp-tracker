import type { CoinKind } from "../domain/coins";

export interface CoinRowProps {
  kind: CoinKind;
  /** Full denomination name, e.g. "Gold". */
  label: string;
  /** Abbreviation, e.g. "gp". */
  unit: string;
  count: number;
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
export function CoinRow({ kind, label, unit, count, onAdd, onSpend, onEdit }: CoinRowProps) {
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
      <span className="coin-row__controls">
        <button
          type="button"
          className="coin-row__step"
          aria-label={`Spend 1 ${label}`}
          disabled={count <= 0}
          onClick={tap(onSpend)}
        >
          −
        </button>
        <button
          type="button"
          className="coin-row__count"
          aria-label={`${label} — ${count} ${unit}, edit`}
          onClick={tap(onEdit)}
        >
          {count}
        </button>
        <button type="button" className="coin-row__step" aria-label={`Add 1 ${label}`} onClick={tap(onAdd)}>
          +
        </button>
      </span>
    </div>
  );
}
