import { ControlGlyph } from "./ControlGlyph";
import "./controls.css";

export interface StepperProps {
  /**
   * What the stepper adjusts (e.g. "Modifier", "Copper"). Used to build the
   * accessible names "Decrease {label}" / "Increase {label}". Not rendered.
   */
  label: string;
  /** The current value, shown as a tabular-nums readout between the buttons. */
  value: number;
  /** Format the readout (e.g. signed modifier `+3`). Defaults to `String(value)`. */
  formatValue?: (value: number) => string;
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

/** A `−  value  +` control. One style for the modifier, coin steps and max-HP nudges. */
export function Stepper({
  label,
  value,
  formatValue,
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
        aria-label={`Decrease ${label}`}
        onClick={onDec}
        disabled={disabled || decDisabled}
      >
        <ControlGlyph name="minus" />
      </button>
      <span className="ctl-stepper__value">
        {(formatValue ?? String)(value)}
      </span>
      <button
        type="button"
        className="ctl-stepper__btn"
        aria-label={`Increase ${label}`}
        onClick={onInc}
        disabled={disabled || incDisabled}
      >
        <ControlGlyph name="plus" />
      </button>
    </div>
  );
}
