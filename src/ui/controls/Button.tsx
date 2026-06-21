import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./controls.css";

export type ButtonVariant = "primary" | "ghost" | "heal" | "danger";
export type ButtonSize = "lg" | "md" | "sm";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** Visual role. `primary` = brushed-gold pill, `ghost` = hairline, `heal` = emerald, `danger` = ruby. */
  variant?: ButtonVariant;
  /** Tap-target size: `lg` ≈56px (surface action), `md` ≈44px, `sm` ≈34px (inline). */
  size?: ButtonSize;
  /** Optional leading icon (an SVG Glyph), rendered before the label. */
  leading?: ReactNode;
  children: ReactNode;
}

/**
 * Text action button. The one main action on a surface is `primary`; secondary
 * actions are `ghost`. Always `type="button"` so it never submits a form.
 */
export function Button({
  variant = "primary",
  size = "md",
  leading,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={["ctl-btn", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {leading != null && <span className="ctl-btn__icon">{leading}</span>}
      <span className="ctl-btn__label">{children}</span>
    </button>
  );
}
