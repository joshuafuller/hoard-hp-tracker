import type { ReactNode } from "react";

export interface StepButtonProps {
  /** Accessible name (e.g. "Damage 5"). */
  label: string;
  /** Visible glyph; defaults to the label when omitted. */
  children?: ReactNode;
  /** Visual emphasis — primary buttons are larger. */
  variant?: "primary" | "secondary";
  onPress: () => void;
}

/** Fire a short haptic pulse where supported; a silent no-op otherwise. */
function haptic() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

/**
 * A big, round, tactile step button. Tap targets are ≥44px (CSS enforces a
 * larger primary size), it springs on press, and it pulses the haptics on
 * activation where the platform supports it.
 */
export function StepButton({
  label,
  children,
  variant = "primary",
  onPress,
}: StepButtonProps) {
  return (
    <button
      type="button"
      className="step-button"
      data-variant={variant}
      aria-label={label}
      style={{ minWidth: "44px", minHeight: "44px" }}
      onClick={() => {
        haptic();
        onPress();
      }}
    >
      <span aria-hidden="true" className="step-button__glyph">
        {children ?? label}
      </span>
    </button>
  );
}
