import { type ReactNode, useEffect, useRef, useState } from "react";
import type { HpState } from "../domain/hp";
import { tierFor } from "./HpBar";

/** Which direction `current` last moved — drives the damage/heal flash. */
type Flash = "damage" | "heal";

export interface HpDisplayProps extends HpState {
  /** When provided, the value becomes a button that opens its editor. */
  onEditCurrent?: () => void;
  onEditMax?: () => void;
  onEditTemp?: () => void;
}

/**
 * The hero readout: a huge luminous `current`, the `/max` beneath it, and a
 * `+temp` badge that appears only while temporary HP is in play. Presentational
 * — it derives a transient damage/heal flash purely from prop changes. When edit
 * callbacks are passed, each value becomes a tappable button that opens its editor.
 */
export function HpDisplay({
  current,
  max,
  temp,
  onEditCurrent,
  onEditMax,
  onEditTemp,
}: HpDisplayProps) {
  // Flash on the total pool (current + temp) so a hit absorbed entirely by
  // temporary HP still registers as damage, and topping up temp reads as a heal.
  const flash = useChangeFlash(current + temp);

  return (
    <div
      className="hp-display"
      data-testid="hp-display"
      data-tier={tierFor(current, max)}
      data-flash={flash ?? undefined}
    >
      <output
        role="status"
        aria-label={`${current} of ${max} hit points${
          temp > 0 ? `, ${temp} temporary` : ""
        }`}
        className="hp-display__readout"
      >
        <EditableValue
          className="hp-display__current"
          testid="hp-current"
          label="Edit current HP"
          onEdit={onEditCurrent}
        >
          {current}
        </EditableValue>
        <EditableValue
          className="hp-display__max"
          testid="hp-max"
          label="Edit maximum HP"
          onEdit={onEditMax}
        >
          / {max}
        </EditableValue>
      </output>
      {onEditTemp ? (
        // Always tappable when editable, even at 0, so temp HP can be added from 0.
        <button
          type="button"
          className="hp-display__temp hp-display__temp--edit"
          data-testid="hp-temp-badge"
          aria-label="Edit temporary HP"
          data-empty={temp === 0 || undefined}
          onClick={onEditTemp}
        >
          +{temp}
        </button>
      ) : (
        temp > 0 && (
          <span
            className="hp-display__temp"
            data-testid="hp-temp-badge"
            aria-hidden="true"
          >
            +{temp}
          </span>
        )
      )}
    </div>
  );
}

/** A display value that is a plain span, or a button when given an `onEdit`. */
function EditableValue({
  className,
  testid,
  label,
  onEdit,
  children,
}: {
  className: string;
  testid: string;
  label: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  if (onEdit) {
    return (
      <button
        type="button"
        className={`${className} hp-display__edit`}
        data-testid={testid}
        aria-label={label}
        onClick={onEdit}
      >
        {children}
      </button>
    );
  }
  return (
    <span className={className} data-testid={testid}>
      {children}
    </span>
  );
}

/**
 * Returns the flash direction for one animation frame's worth of renders after
 * `value` changes, then clears it. Returns `undefined` on the first render and
 * once the flash has elapsed.
 */
function useChangeFlash(value: number, holdMs = 450): Flash | undefined {
  const previous = useRef(value);
  const [flash, setFlash] = useState<Flash | undefined>(undefined);

  useEffect(() => {
    if (value === previous.current) return;
    setFlash(value < previous.current ? "damage" : "heal");
    previous.current = value;
    const timer = setTimeout(() => setFlash(undefined), holdMs);
    return () => clearTimeout(timer);
  }, [value, holdMs]);

  return flash;
}
