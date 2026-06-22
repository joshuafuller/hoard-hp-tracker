import "./controls.css";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional sub-label rendered small under the main label. */
  hint?: string;
  /** Disable just this option (the rest stay selectable). */
  disabled?: boolean;
}

export interface SegmentProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Accessible name for the group (e.g. "Roll mode"). */
  "aria-label"?: string;
  className?: string;
}

/**
 * Grouped segmented control — co-equal segments, exactly one active. Reusable
 * for any 2–3-way choice (advantage / normal / disadvantage). Honours the
 * "co-equal, never lopsided" rule: every segment shares one width.
 */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
  className,
}: SegmentProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={["ctl-segment", className].filter(Boolean).join(" ")}
      style={{ "--ctl-segment-count": options.length } as React.CSSProperties}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className="ctl-segment__option"
            data-active={active}
            aria-pressed={active}
            disabled={disabled || opt.disabled}
            onClick={() => onChange(opt.value)}
          >
            <span className="ctl-segment__label">{opt.label}</span>
            {opt.hint != null && (
              <small className="ctl-segment__hint">{opt.hint}</small>
            )}
          </button>
        );
      })}
    </div>
  );
}
