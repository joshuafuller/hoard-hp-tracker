import type { ReactNode } from "react";
import { ControlGlyph } from "./ControlGlyph";
import "./controls.css";

export interface StepperProps {
  /**
   * What the stepper adjusts (e.g. "Modifier", "Copper"). Used to build the
   * accessible names "Decrease {label}" / "Increase {label}". Not rendered.
   */
  label: string;
  /** The current value, shown as a tabular-nums readout between the buttons. */
  value?: number;
  /** Format the readout (e.g. signed modifier `+3`). Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
  /**
   * An interactive middle slot rendered INSTEAD of the readout — e.g. a tappable
   * coin count or a typed HP input. When provided, `value`/`formatValue` are ignored.
   */
  children?: ReactNode;
  /** Override the decrement button's accessible name (default "Decrease {label}"). */
  decLabel?: string;
  /** Override the increment button's accessible name (default "Increase {label}"). */
  incLabel?: string;
  onDec: () => void;
  onInc: () => void;
  /** Disable both buttons. */
  disabled?: boolean;
  /** Disable just the decrement (e.g. already at the minimum). */
  decDisabled?: boolean;
  /** Disable just the increment (e.g. already at the maximum). */
  incDisabled?: boolean;
  className?: string;
}

/**
 * A `−  value  +` control. One style for the modifier, coin steps and max-HP nudges.
 * Pass `children` for an interactive middle (a tappable count / typed input) instead
 * of the static readout.
 */
export function Stepper({
  label,
  value,
  formatValue,
  children,
  decLabel,
  incLabel,
  onDec,
  onInc,
  disabled = false,
  decDisabled = false,
  incDisabled = false,
  className,
}: StepperProps) {
  return (
    <div className={["ctl-stepper", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="ctl-stepper__btn"
        aria-label={decLabel ?? `Decrease ${label}`}
        onClick={onDec}
        disabled={disabled || decDisabled}
      >
        <ControlGlyph name="minus" />
      </button>
      {children ?? (
        <span className="ctl-stepper__value">
          {(formatValue ?? String)(value ?? 0)}
        </span>
      )}
      <button
        type="button"
        className="ctl-stepper__btn"
        aria-label={incLabel ?? `Increase ${label}`}
        onClick={onInc}
        disabled={disabled || incDisabled}
      >
        <ControlGlyph name="plus" />
      </button>
    </div>
  );
}
