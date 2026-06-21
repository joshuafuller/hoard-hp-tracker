import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./controls.css";

export type KeyTone = "digit" | "muted" | "secondary";

export interface KeyProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** `digit` = a number key; `muted` = a low-emphasis key (e.g. "."); `secondary` = an action key. */
  tone?: KeyTone;
  children: ReactNode;
}

/**
 * A single keypad key, styled from the shared control tokens so the numeric pad
 * matches the rest of the system. The keypad keeps its own *grid* layout — this
 * primitive only standardises one key's look and behaviour.
 */
export function Key({
  tone = "digit",
  className,
  children,
  ...rest
}: KeyProps) {
  return (
    <button
      type="button"
      className={["ctl-key", className].filter(Boolean).join(" ")}
      data-tone={tone}
      {...rest}
    >
      {children}
    </button>
  );
}
