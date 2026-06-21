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
  /** Show a remove (×) affordance; fires `onRemove`. */
  removable?: boolean;
  onRemove?: () => void;
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
  className,
  children,
  "aria-label": ariaLabel,
  ...rest
}: ChipProps) {
  return (
    <span className="ctl-chip-wrap">
      <button
        type="button"
        className={["ctl-chip", className].filter(Boolean).join(" ")}
        data-selected={selected === undefined ? undefined : selected}
        aria-pressed={selected === undefined ? undefined : selected}
        aria-label={ariaLabel}
        {...rest}
      >
        <span className="ctl-chip__label">{children}</span>
        {badge !== undefined && <span className="ctl-chip__badge">{badge}</span>}
      </button>
      {removable && (
        <button
          type="button"
          className="ctl-chip__remove"
          aria-label={`Remove ${ariaLabel ?? ""}`.trim()}
          onClick={onRemove}
        >
          <ControlGlyph name="close" size={14} />
        </button>
      )}
    </span>
  );
}
