import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./controls.css";

export type IconButtonVariant = "token" | "ghost";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "children"> {
  /** `token` = gold medallion (chrome entry point); `ghost` = subtle round (close, log). */
  variant?: IconButtonVariant;
  /**
   * Toggle state. When provided the button becomes a toggle and exposes
   * `aria-pressed` (folds in sound / concentration toggles). Omit for a plain
   * action button (e.g. close), which then has no `aria-pressed`.
   */
  pressed?: boolean;
  /** Required: icon-only buttons have no text, so they need an accessible name. */
  "aria-label": string;
  /** The icon to render (an SVG Glyph). */
  children: ReactNode;
}

/**
 * Round, icon-only button. Requires an `aria-label` for its accessible name.
 * Pass `pressed` to make it a toggle (adds a stable `aria-pressed`).
 */
export function IconButton({
  variant = "token",
  pressed,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={["ctl-icon-btn", className].filter(Boolean).join(" ")}
      data-variant={variant}
      aria-pressed={pressed === undefined ? undefined : pressed}
      {...rest}
    >
      {children}
    </button>
  );
}
