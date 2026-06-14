import { useId, useState } from "react";
import type { HitDieSize } from "../domain/hitDice";
import { NumberEditor } from "./NumberEditor";

export interface HitDicePanelProps {
  /** The hit-die face size (d6 through d12). */
  size: HitDieSize;
  /** Total Hit Dice (= character level). */
  total: number;
  /** Unspent Hit Dice, in `[0, total]`. */
  available: number;
  /** CON modifier added to each Hit Die roll. */
  conMod: number;
  onSetSize: (size: HitDieSize) => void;
  onSetTotal: (n: number) => void;
  onSetAvailable: (n: number) => void;
  onSetConMod: (n: number) => void;
}

const DIE_SIZES: readonly HitDieSize[] = [6, 8, 10, 12];

/**
 * The Hit Dice panel: an advanced resource folded behind a disclosure so a
 * casual user sees only HP + rests, while the readout stays glanceable on the
 * summary. Collapsed by default; expanding reveals a one-line explainer and the
 * editor row (die size, pool total, unspent count, CON modifier). The body is
 * rendered only when open. Presentational; values in, callbacks out.
 */
export function HitDicePanel({
  size,
  total,
  available,
  conMod,
  onSetSize,
  onSetTotal,
  onSetAvailable,
  onSetConMod,
}: HitDicePanelProps) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <section className="hit-dice" aria-label="Hit Dice">
      <button
        type="button"
        className="hit-dice__summary"
        aria-expanded={open}
        // Only reference the body when it's actually mounted (collapsed = not rendered).
        aria-controls={open ? bodyId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hit-dice__title">Hit Dice</span>
        <span
          className="hit-dice__readout"
          aria-label={`${available} of ${total} Hit Dice remaining (d${size})`}
        >
          <span className="hit-dice__available">{available}</span>
          <span className="hit-dice__sep" aria-hidden="true">
            /
          </span>
          <span className="hit-dice__total">{total}</span>
          <span className="hit-dice__die">d{size}</span>
        </span>
        <span className="hit-dice__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="hit-dice__body" id={bodyId}>
          <p className="hit-dice__explainer">
            Spend on a short rest to heal — each die restores its roll + your CON
            modifier. Total = your level; die = your class.
          </p>

          <div className="hit-dice__editors">
            <label className="hit-dice__size">
              <span className="hit-dice__size-label">Hit die (per level)</span>
              <select
                className="hit-dice__size-select"
                value={size}
                onChange={(e) =>
                  onSetSize(Number(e.target.value) as HitDieSize)
                }
              >
                {DIE_SIZES.map((d) => (
                  <option key={d} value={d}>
                    d{d}
                  </option>
                ))}
              </select>
            </label>

            <NumberEditor
              label="Hit Dice total"
              value={total}
              onCommit={onSetTotal}
            />
            <NumberEditor
              label="Available now"
              value={available}
              onCommit={onSetAvailable}
            />
            <NumberEditor
              label="CON modifier"
              value={conMod}
              onCommit={onSetConMod}
            />
          </div>
        </div>
      )}
    </section>
  );
}
