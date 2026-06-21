import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ControlGlyph } from "./ControlGlyph";
import "./controls.css";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /**
   * Selection state. When provided the chip is selectable and exposes
   * `aria-pressed`. Omit for a plain readout chip (no `aria-pressed`).
   */
  selected?: boolean;
  /** A count badge shown in the corner (e.g. how many of this die are pooled). */
  badge?: number;
  /** Show a remove (×) affordance; fires `onRemove`. Requires `onRemove`. */
  removable?: boolean;
  onRemove?: () => void;
  /**
   * Accessible name for the remove (×) control. Prefer passing this for an
   * unambiguous label (e.g. "Remove d6"). If omitted it derives from string
   * children ("Remove d6"), falling back to a plain "Remove".
   */
  removeLabel?: string;
  children: ReactNode;
}

/**
 * Selectable / removable / readout pill. Used for die chips, coin denominations,
 * result dice and pool tags. Selection is conveyed via `aria-pressed`.
 */
export function Chip({
  selected,
  badge,
  removable = false,
  onRemove,
  removeLabel,
  className,
  children,
  disabled,
  "aria-label": ariaLabel,
  ...rest
}: ChipProps) {
  // Only render the × when it can actually do something — a removable chip with
  // no onRemove would be a dead, focusable control.
  const showRemove = removable && onRemove !== undefined;
  // Derive an unambiguous remove label: explicit prop > string children > plain.
  const removeName =
    removeLabel ??
    (typeof children === "string" ? `Remove ${children}` : "Remove");
  return (
    <span className="ctl-chip-wrap">
      <button
        type="button"
        className={["ctl-chip", className].filter(Boolean).join(" ")}
        data-selected={selected === undefined ? undefined : selected}
        aria-pressed={selected === undefined ? undefined : selected}
        aria-label={ariaLabel}
        disabled={disabled}
        {...rest}
      >
        <span className="ctl-chip__label">{children}</span>
        {badge !== undefined && <span className="ctl-chip__badge">{badge}</span>}
      </button>
      {showRemove && (
        <button
          type="button"
          className="ctl-chip__remove"
          aria-label={removeName}
          onClick={onRemove}
          disabled={disabled}
        >
          <ControlGlyph name="close" size={14} />
        </button>
      )}
    </span>
  );
}
